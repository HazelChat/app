/**
 * Hazel Bot SDK - Convenience layer for Hazel chat app integrations
 *
 * This module provides a simplified, Hazel-specific API on top of the generic bot-sdk.
 * All Hazel domain schemas are pre-configured, making it trivial to build integrations.
 */

import { Channel, ChannelMember, Message } from "@hazel/domain/models"
import { Config, Effect, Layer, ManagedRuntime, type Schema } from "effect"
import { BotAuth, createAuthContextFromToken } from "./auth.ts"
import { createBotClientTag } from "./bot-client.ts"
import type { HandlerError } from "./errors.ts"
import type { EventQueueConfig } from "./services/index.ts"
import { ElectricEventQueue, EventDispatcher, ShapeStreamSubscriber } from "./services/index.ts"

/**
 * Pre-configured Hazel domain subscriptions
 * Includes: messages, channels, channel_members with their schemas
 */
export const HAZEL_SUBSCRIPTIONS = [
	{
		table: "messages",
		schema: Message.Model.json,
		startFromNow: true,
	},
	{
		table: "channels",
		schema: Channel.Model.json,
		startFromNow: true,
	},
	{
		table: "channel_members",
		schema: ChannelMember.Model.json,
		startFromNow: true,
	},
] as const

/**
 * Hazel-specific type aliases for convenience
 */
export type MessageType = Schema.Schema.Type<typeof Message.Model.json>
export type ChannelType = Schema.Schema.Type<typeof Channel.Model.json>
export type ChannelMemberType = Schema.Schema.Type<typeof ChannelMember.Model.json>

/**
 * Hazel-specific event handlers
 */
export type MessageHandler<E = HandlerError, R = never> = (
	message: MessageType,
) => Effect.Effect<void, E, R>
export type ChannelHandler<E = HandlerError, R = never> = (
	channel: ChannelType,
) => Effect.Effect<void, E, R>
export type ChannelMemberHandler<E = HandlerError, R = never> = (
	member: ChannelMemberType,
) => Effect.Effect<void, E, R>

/**
 * Hazel Bot Client - Effect Service with typed convenience methods
 */
export class HazelBotClient extends Effect.Service<HazelBotClient>()("HazelBotClient", {
	accessors: true,
	effect: Effect.gen(function* () {
		// Get the typed BotClient for Hazel subscriptions
		const bot = yield* createBotClientTag<typeof HAZEL_SUBSCRIPTIONS>()

		return {
			/**
			 * Register a handler for new messages
			 */
			onMessage: <E = HandlerError, R = never>(handler: MessageHandler<E, R>) =>
				bot.on("messages.insert", handler),

			/**
			 * Register a handler for message updates
			 */
			onMessageUpdate: <E = HandlerError, R = never>(handler: MessageHandler<E, R>) =>
				bot.on("messages.update", handler),

			/**
			 * Register a handler for message deletes
			 */
			onMessageDelete: <E = HandlerError, R = never>(handler: MessageHandler<E, R>) =>
				bot.on("messages.delete", handler),

			/**
			 * Register a handler for new channels
			 */
			onChannelCreated: <E = HandlerError, R = never>(handler: ChannelHandler<E, R>) =>
				bot.on("channels.insert", handler),

			/**
			 * Register a handler for channel updates
			 */
			onChannelUpdated: <E = HandlerError, R = never>(handler: ChannelHandler<E, R>) =>
				bot.on("channels.update", handler),

			/**
			 * Register a handler for channel deletes
			 */
			onChannelDeleted: <E = HandlerError, R = never>(handler: ChannelHandler<E, R>) =>
				bot.on("channels.delete", handler),

			/**
			 * Register a handler for new channel members
			 */
			onChannelMemberAdded: <E = HandlerError, R = never>(handler: ChannelMemberHandler<E, R>) =>
				bot.on("channel_members.insert", handler),

			/**
			 * Register a handler for removed channel members
			 */
			onChannelMemberRemoved: <E = HandlerError, R = never>(handler: ChannelMemberHandler<E, R>) =>
				bot.on("channel_members.delete", handler),

			/**
			 * Start the bot client
			 * Begins listening to events and dispatching to handlers
			 */
			start: bot.start,

			/**
			 * Get bot authentication context
			 */
			getAuthContext: bot.getAuthContext,
		}
	}),
}) {}

/**
 * Configuration for creating a Hazel bot
 */
export interface HazelBotConfig {
	/**
	 * Electric proxy URL
	 * @default "https://electric.hazel.sh/v1/shape"
	 * @example "http://localhost:8787/v1/shape" // For local development
	 */
	readonly electricUrl?: string

	/**
	 * Bot authentication token (required)
	 */
	readonly botToken: string

	/**
	 * Event queue configuration (optional)
	 */
	readonly queueConfig?: EventQueueConfig

	/**
	 * Event dispatcher configuration (optional)
	 */
	readonly dispatcherConfig?: import("./services/event-dispatcher.ts").EventDispatcherConfig
}

/**
 * Create a Hazel bot runtime with pre-configured subscriptions
 *
 * This is the simplest way to create a bot for Hazel integrations.
 * All Hazel domain schemas (messages, channels, channel_members) are pre-configured.
 *
 * @example
 * ```typescript
 * import { createHazelBot, HazelBotClient } from "@hazel/bot-sdk"
 *
 * // Minimal config - just botToken! electricUrl defaults to https://electric.hazel.sh/v1/shape
 * const runtime = createHazelBot({
 *   botToken: process.env.BOT_TOKEN!,
 * })
 *
 * // Or override electricUrl for local development
 * const devRuntime = createHazelBot({
 *   electricUrl: "http://localhost:8787/v1/shape",
 *   botToken: process.env.BOT_TOKEN!,
 * })
 *
 * const program = Effect.gen(function* () {
 *   const bot = yield* HazelBotClient
 *
 *   yield* bot.onMessage((message) => {
 *     console.log("New message:", message.content)
 *   })
 *
 *   yield* bot.start
 * })
 *
 * runtime.runPromise(program.pipe(Effect.scoped))
 * ```
 */
export const createHazelBot = (
	config: HazelBotConfig,
): ManagedRuntime.ManagedRuntime<HazelBotClient, unknown> => {
	// Apply default electricUrl if not provided
	const electricUrl = config.electricUrl ?? "https://electric.hazel.sh/v1/shape"

	// Create all the required layers using layerConfig pattern
	const EventQueueLayer = ElectricEventQueue.layerConfig(
		Config.succeed(
			config.queueConfig ?? {
				capacity: 1000,
				backpressureStrategy: "sliding" as const,
			},
		),
	)

	const ShapeSubscriberLayer = ShapeStreamSubscriber.layerConfig(
		Config.succeed({
			electricUrl,
			botToken: config.botToken,
			subscriptions: HAZEL_SUBSCRIPTIONS,
		}),
	)

	const EventDispatcherLayer = EventDispatcher.layerConfig(
		Config.succeed(
			config.dispatcherConfig ?? {
				maxRetries: 3,
				retryBaseDelay: 100,
			},
		),
	)

	const AuthLayer = Layer.unwrapEffect(
		createAuthContextFromToken(config.botToken).pipe(Effect.map((context) => BotAuth.Default(context))),
	)

	// Create the typed BotClient layer for Hazel subscriptions
	const BotClientTag = createBotClientTag<typeof HAZEL_SUBSCRIPTIONS>()
	const BotClientLayer = Layer.effect(
		BotClientTag,
		Effect.gen(function* () {
			const dispatcher = yield* EventDispatcher
			const subscriber = yield* ShapeStreamSubscriber
			const auth = yield* BotAuth

			return {
				on: (eventType, handler) => dispatcher.on(eventType, handler),
				start: Effect.gen(function* () {
					yield* Effect.log("Starting bot client...")
					yield* subscriber.start
					yield* dispatcher.start
					yield* Effect.log("Bot client started successfully")
				}),
				getAuthContext: auth.getContext.pipe(Effect.orDie),
			}
		}),
	)

	// Compose all layers with proper dependency order
	const AllLayers = HazelBotClient.Default.pipe(
		Layer.provide(BotClientLayer),
		Layer.provide(
			Layer.mergeAll(
				Layer.provide(EventDispatcherLayer, EventQueueLayer),
				Layer.provide(ShapeSubscriberLayer, EventQueueLayer),
				AuthLayer,
			),
		),
	)

	// Create runtime
	return ManagedRuntime.make(AllLayers)
}
