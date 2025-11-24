import { Context, Effect, Layer, type ManagedRuntime, type Scope } from "effect"
import { BotAuth, type BotAuthContext } from "./auth.ts"
import { BotStartError } from "./errors.ts"
import { EventDispatcher } from "./services/event-dispatcher.ts"
import { ShapeStreamSubscriber, type ShapeSubscriptionConfig } from "./services/shape-stream-subscriber.ts"
import type { EventHandler } from "./types/handlers.ts"
import type {
	EventSchemaMap,
	SubscriptionEventTypes,
} from "./types/subscription-types.ts"

/**
 * Bot client interface with typed event handlers
 */
export interface TypedBotClient<Subs extends readonly ShapeSubscriptionConfig[]> {
	/**
	 * Register a typed event handler for a specific event type
	 * The handler's value type is automatically inferred from the subscription schema
	 * @template E - Event type from subscriptions
	 * @template Err - Error type for the handler (defaults to HandlerError)
	 * @template R - Required context/services for the handler
	 */
	on<E extends SubscriptionEventTypes<Subs>, Err = any, R = never>(
		eventType: E,
		handler: EventHandler<EventSchemaMap<Subs>[E], Err, R>,
	): Effect.Effect<void>

	/**
	 * Start the bot client
	 * Requires Scope because it starts scoped resources
	 */
	readonly start: Effect.Effect<void, BotStartError, Scope.Scope>

	/**
	 * Get bot authentication context
	 */
	readonly getAuthContext: Effect.Effect<BotAuthContext>
}

/**
 * Create a typed BotClient tag for specific subscriptions
 */
export const createBotClientTag = <Subs extends readonly ShapeSubscriptionConfig[]>() =>
	Context.GenericTag<TypedBotClient<Subs>>("BotClient")

/**
 * Default BotClient tag (untyped)
 */
export const BotClient = Context.GenericTag<TypedBotClient<any>>("BotClient")

/**
 * Create a BotClient layer from its dependencies
 */
export const createBotClientLayer = <
	Subs extends readonly ShapeSubscriptionConfig[],
>(): Layer.Layer<
	TypedBotClient<Subs>,
	never,
	EventDispatcher | ShapeStreamSubscriber | BotAuth
> =>
	Layer.effect(
		createBotClientTag<Subs>(),
		Effect.gen(function* () {
			const dispatcher = yield* EventDispatcher
			const subscriber = yield* ShapeStreamSubscriber
			const auth = yield* BotAuth

			return {
				on: (eventType, handler) => dispatcher.on(eventType, handler),

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

				getAuthContext: auth.getContext.pipe(Effect.orDie),
			} satisfies TypedBotClient<Subs>
		}),
	)

/**
 * Helper type for bot application
 */
export type BotApp<Subs extends readonly ShapeSubscriptionConfig[], R = never> = Effect.Effect<
	void,
	never,
	TypedBotClient<Subs> | Scope.Scope | R
>

/**
 * Run a bot application
 */
export const runBot = <Subs extends readonly ShapeSubscriptionConfig[], R>(
	app: BotApp<Subs, R>,
	runtime: ManagedRuntime.ManagedRuntime<TypedBotClient<Subs> | R, unknown>,
): void => {
	const program = Effect.scoped(app)

	runtime.runFork(program)
}
