/**
 * Hazel Bot SDK - Convenience layer for Hazel chat app integrations
 *
 * This module provides a simplified, Hazel-specific API on top of the generic bot-sdk.
 * All Hazel domain schemas are pre-configured, making it trivial to build integrations.
 */

import { Channel, ChannelMember, Message } from "@hazel/domain/models"
import { Config, Effect, Layer, ManagedRuntime, type Schema } from "effect"
import type { ConfigError } from "effect"
import { BotAuth, createAuthContextFromToken } from "./auth.ts"
import { createBotClientTag } from "./bot-client.ts"
import { ElectricEventQueue, EventDispatcher, ShapeStreamSubscriber } from "./services/index.ts"
import type { EventQueueConfig } from "./services/index.ts"
import type { HandlerError } from "./errors.ts"

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
export type MessageHandler<R = never> = (message: MessageType) => Effect.Effect<void, HandlerError, R>
export type ChannelHandler<R = never> = (channel: ChannelType) => Effect.Effect<void, HandlerError, R>
export type ChannelMemberHandler<R = never> = (
	member: ChannelMemberType,
) => Effect.Effect<void, HandlerError, R>

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
			onMessage: <R>(handler: MessageHandler<R>) => bot.on("messages.insert", handler),

			/**
			 * Register a handler for message updates
			 */
			onMessageUpdate: <R>(handler: MessageHandler<R>) => bot.on("messages.update", handler),

			/**
			 * Register a handler for message deletes
			 */
			onMessageDelete: <R>(handler: MessageHandler<R>) => bot.on("messages.delete", handler),

			/**
			 * Register a handler for new channels
			 */
			onChannelCreated: <R>(handler: ChannelHandler<R>) => bot.on("channels.insert", handler),

			/**
			 * Register a handler for channel updates
			 */
			onChannelUpdated: <R>(handler: ChannelHandler<R>) => bot.on("channels.update", handler),

			/**
			 * Register a handler for channel deletes
			 */
			onChannelDeleted: <R>(handler: ChannelHandler<R>) => bot.on("channels.delete", handler),

			/**
			 * Register a handler for new channel members
			 */
			onChannelMemberAdded: <R>(handler: ChannelMemberHandler<R>) =>
				bot.on("channel_members.insert", handler),

			/**
			 * Register a handler for removed channel members
			 */
			onChannelMemberRemoved: <R>(handler: ChannelMemberHandler<R>) =>
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
	 * @example "http://localhost:8787/v1/shape"
	 * @example "https://electric-proxy.example.workers.dev/v1/shape"
	 */
	readonly electricUrl: string

	/**
	 * Bot authentication token
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
 * const runtime = createHazelBot({
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
			electricUrl: config.electricUrl,
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
