import { Config, Effect, Fiber, Layer, Schedule, type Scope } from "effect"
import type { ConfigError } from "effect"
import { HandlerError } from "../errors.ts"
import { composeMiddleware, type Middleware } from "../middleware.ts"
import type { EventType } from "../types/events.ts"
import type { EventHandler, EventHandlerRegistry } from "../types/handlers.ts"
import { ElectricEventQueue } from "./electric-event-queue.ts"

/**
 * Configuration for event dispatcher
 */
export interface EventDispatcherConfig {
	/**
	 * Maximum number of retry attempts for failed handlers
	 * @default 3
	 */
	readonly maxRetries: number

	/**
	 * Base delay for exponential backoff (in milliseconds)
	 * @default 100
	 */
	readonly retryBaseDelay: number

	/**
	 * Middleware to apply to all handlers
	 * @default []
	 */
	readonly middleware?: readonly Middleware[]
}

/**
 * Default dispatcher configuration
 */
export const defaultEventDispatcherConfig: EventDispatcherConfig = {
	maxRetries: 3,
	retryBaseDelay: 100,
}

/**
 * Service that dispatches events to registered handlers
 */
export class EventDispatcher extends Effect.Service<EventDispatcher>()("EventDispatcher", {
	accessors: true,
	effect: Effect.fn(function* (config: EventDispatcherConfig) {
		const queue = yield* ElectricEventQueue

		// Registry of event handlers (Map-based for dynamic event types)
		const registry: EventHandlerRegistry = new Map()

		// Retry policy with exponential backoff
		const retryPolicy = Schedule.exponential(config.retryBaseDelay).pipe(
			Schedule.intersect(Schedule.recurs(config.maxRetries)),
		)

		// Helper to get or create handler set for an event type
		const getHandlers = (eventType: EventType): Set<EventHandler<any, any, any>> => {
			let handlers = registry.get(eventType)
			if (!handlers) {
				handlers = new Set()
				registry.set(eventType, handlers)
			}
			return handlers
		}

		// Compose all middleware
		const composedMiddleware = composeMiddleware(config.middleware || [])

		// Helper to dispatch event to handlers
		const dispatchToHandlers = (eventType: EventType, value: any) =>
			Effect.gen(function* () {
				const handlers = registry.get(eventType)
				if (!handlers || handlers.size === 0) {
					return
				}

				// Execute all handlers in parallel
				// Note: Type cast is safe because handler requirements (R) are satisfied by runtime layers
				yield* Effect.forEach(
					Array.from(handlers),
					(handler) => {
						// Wrap handler with middleware
						const wrappedHandler = composedMiddleware(
							value,
							eventType,
							handler(value) as Effect.Effect<void, any, never>,
						)

						return wrappedHandler.pipe(
							Effect.retry(retryPolicy),
							Effect.catchAllCause((cause) =>
								Effect.logError("Handler failed after retries", {
									cause,
									eventType,
								}).pipe(
									Effect.annotateLogs("service", "EventDispatcher"),
								),
							),
						)
					},
					{ concurrency: "unbounded" },
				)
			}) as Effect.Effect<void, never>

		// Helper to start consuming events for a specific event type
		const consumeEvents = (eventType: EventType): Effect.Effect<void, never, Scope.Scope> =>
			Effect.gen(function* () {
				yield* Effect.logInfo(`Starting event consumer`, { eventType }).pipe(
					Effect.annotateLogs("service", "EventDispatcher"),
				)

				// Continuously take events from queue and dispatch
				const fiber = yield* Effect.forkScoped(
					Effect.forever(
						Effect.gen(function* () {
							// Take next event (blocks until available)
							const event = yield* queue.take(eventType).pipe(
								Effect.catchAll((error) =>
									Effect.gen(function* () {
										yield* Effect.logError("Failed to take event from queue", {
											error,
											eventType,
										}).pipe(
											Effect.annotateLogs("service", "EventDispatcher"),
										)
										// Wait a bit before retrying
										yield* Effect.sleep(1000)
										// Return null to skip this iteration
										return null as any
									}),
								),
							)

							if (!event) {
								return
							}

							// Dispatch to handlers based on event type
							yield* dispatchToHandlers(eventType, event.value)
						}),
					),
				)

				// Interrupt fiber on scope close
				yield* Effect.addFinalizer(() =>
					Effect.gen(function* () {
						yield* Effect.logInfo(`Stopping event consumer`, { eventType }).pipe(
							Effect.annotateLogs("service", "EventDispatcher"),
						)
						yield* Fiber.interrupt(fiber)
					}),
				)
			})

		return {
			/**
			 * Register a generic event handler for a specific event type
			 */
			on: <A, E, R>(eventType: EventType, handler: EventHandler<A, E, R>) =>
				Effect.sync(() => {
					getHandlers(eventType).add(handler as EventHandler<any, any, any>)
				}),

			/**
			 * Start the event dispatcher - begins consuming events for all registered handlers
			 */
			start: Effect.gen(function* () {
				yield* Effect.logInfo("Starting event dispatcher").pipe(
					Effect.annotateLogs("service", "EventDispatcher"),
				)

				// Start consumers for all registered event types
				const eventTypes = Array.from(registry.keys())

				if (eventTypes.length === 0) {
					yield* Effect.logWarning("No handlers registered, dispatcher has nothing to do").pipe(
						Effect.annotateLogs("service", "EventDispatcher"),
					)
					return
				}

				yield* Effect.forEach(eventTypes, consumeEvents, {
					concurrency: "unbounded",
				})

				yield* Effect.logInfo(`Event dispatcher started`, {
					eventTypesCount: eventTypes.length,
					eventTypes: eventTypes.join(", "),
				}).pipe(
					Effect.annotateLogs("service", "EventDispatcher"),
				)
			}),
		}
	}),
}) {
	/**
	 * Create a layer from Effect Config
	 */
	static readonly layerConfig = (
		config: Config.Config.Wrap<EventDispatcherConfig>,
	): Layer.Layer<EventDispatcher, ConfigError.ConfigError, ElectricEventQueue> =>
		Layer.unwrapEffect(
			Config.unwrap(config).pipe(Effect.map((cfg) => EventDispatcher.Default(cfg))),
		)
}
