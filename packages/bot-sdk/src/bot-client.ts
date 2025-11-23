import { Effect, type ManagedRuntime, type Scope } from "effect"
import { BotAuth, type BotAuthContext } from "./auth.ts"
import { BotStartError } from "./errors.ts"
import { EventDispatcher } from "./services/event-dispatcher.ts"
import { ShapeStreamSubscriber } from "./services/shape-stream-subscriber.ts"
import type {
	ChannelCreatedHandler,
	ChannelDeletedHandler,
	ChannelMemberAddedHandler,
	ChannelMemberRemovedHandler,
	ChannelUpdatedHandler,
	MessageDeleteHandler,
	MessageHandler,
	MessageUpdateHandler,
} from "./types/handlers.ts"

/**
 * Bot client for interacting with the application
 */
export class BotClient extends Effect.Service<BotClient>()("BotClient", {
	accessors: true,
	effect: Effect.gen(function* () {
		const dispatcher = yield* EventDispatcher
		const subscriber = yield* ShapeStreamSubscriber
		const auth = yield* BotAuth

		return {
			/**
			 * Register a handler for new messages
			 */
			onMessage: <R>(handler: MessageHandler<R>) => dispatcher.onMessage(handler),

			/**
			 * Register a handler for message updates
			 */
			onMessageUpdate: <R>(handler: MessageUpdateHandler<R>) => dispatcher.onMessageUpdate(handler),

			/**
			 * Register a handler for message deletes
			 */
			onMessageDelete: <R>(handler: MessageDeleteHandler<R>) => dispatcher.onMessageDelete(handler),

			/**
			 * Register a handler for new channel members
			 */
			onChannelMemberAdded: <R>(handler: ChannelMemberAddedHandler<R>) =>
				dispatcher.onChannelMemberAdded(handler),

			/**
			 * Register a handler for removed channel members
			 */
			onChannelMemberRemoved: <R>(handler: ChannelMemberRemovedHandler<R>) =>
				dispatcher.onChannelMemberRemoved(handler),

			/**
			 * Register a handler for new channels
			 */
			onChannelCreated: <R>(handler: ChannelCreatedHandler<R>) => dispatcher.onChannelCreated(handler),

			/**
			 * Register a handler for channel updates
			 */
			onChannelUpdated: <R>(handler: ChannelUpdatedHandler<R>) => dispatcher.onChannelUpdated(handler),

			/**
			 * Register a handler for channel deletes
			 */
			onChannelDeleted: <R>(handler: ChannelDeletedHandler<R>) => dispatcher.onChannelDeleted(handler),

			/**
			 * Start the bot client
			 * This begins listening to events and dispatching to handlers
			 */
			start: Effect.gen(function* () {
				yield* Effect.log("Starting bot client...")

				// Start shape stream subscriptions
				yield* subscriber.start.pipe(
					Effect.catchAll((error) =>
						Effect.fail(
							new BotStartError({
								message: "Failed to start shape stream subscriptions",
								cause: error,
							}),
						),
					),
				)

				// Start event dispatcher
				yield* dispatcher.start.pipe(
					Effect.catchAll((error) =>
						Effect.fail(
							new BotStartError({
								message: "Failed to start event dispatcher",
								cause: error,
							}),
						),
					),
				)

				yield* Effect.log("Bot client started successfully")
			}),

			/**
			 * Get bot authentication context
			 */
			getAuthContext: auth.getContext.pipe(Effect.orDie),
		}
	}),
}) {}

/**
 * Helper type for bot application
 */
export type BotApp<R = never> = Effect.Effect<void, never, BotClient | Scope.Scope | R>

/**
 * Run a bot application
 */
export const runBot = <R>(
	app: BotApp<R>,
	runtime: ManagedRuntime.ManagedRuntime<BotClient | R, unknown>,
): void => {
	const program = Effect.scoped(app)

	runtime.runFork(program)
}
