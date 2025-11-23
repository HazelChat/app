import { Effect, Fiber, Schedule, type Scope } from "effect"
import { HandlerError } from "../errors.ts"
import type { EventType } from "../types/events.ts"
import type {
	ChannelCreatedHandler,
	ChannelDeletedHandler,
	ChannelMemberAddedHandler,
	ChannelMemberRemovedHandler,
	ChannelUpdatedHandler,
	EventHandlerRegistry,
	MessageDeleteHandler,
	MessageHandler,
	MessageUpdateHandler,
} from "../types/handlers.ts"
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
	effect: Effect.fn(function* (config: EventDispatcherConfig = defaultEventDispatcherConfig) {
		const queue = yield* ElectricEventQueue

		// Registry of event handlers
		const registry: EventHandlerRegistry = {
			"messages.insert": new Set(),
			"messages.update": new Set(),
			"messages.delete": new Set(),
			"channel_members.insert": new Set(),
			"channel_members.delete": new Set(),
			"channels.insert": new Set(),
			"channels.update": new Set(),
			"channels.delete": new Set(),
		}

		// Retry policy with exponential backoff
		const retryPolicy = Schedule.exponential(config.retryBaseDelay).pipe(
			Schedule.intersect(Schedule.recurs(config.maxRetries)),
		)

		// Helper to dispatch event to handlers
		const dispatchToHandlers = (handlers: Set<any>, value: any, eventType: EventType) =>
			Effect.gen(function* () {
				if (handlers.size === 0) {
					return
				}

				// Execute all handlers in parallel
				yield* Effect.forEach(
					Array.from(handlers),
					(handler) =>
						handler(value).pipe(
							Effect.retry(retryPolicy),
							Effect.catchAllCause((cause) =>
								Effect.logError("Handler failed after retries", {
									cause,
									eventType,
								}),
							),
						),
					{ concurrency: "unbounded" },
				)
			}) as Effect.Effect<void, never>

		// Helper to start consuming events for a specific event type
		const consumeEvents = (eventType: EventType): Effect.Effect<void, never, Scope.Scope> =>
			Effect.gen(function* () {
				yield* Effect.log(`Starting event consumer for: ${eventType}`)

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
										})
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
							yield* dispatchToHandlers(registry[eventType], event.value, eventType)
						}),
					),
				)

				// Interrupt fiber on scope close
				yield* Effect.addFinalizer(() =>
					Effect.gen(function* () {
						yield* Effect.log(`Stopping event consumer for: ${eventType}`)
						yield* Fiber.interrupt(fiber)
					}),
				)
			})

		return {
			onMessage: <R>(handler: MessageHandler<R>) =>
				Effect.sync(() => {
					registry["messages.insert"].add(handler)
				}),

			onMessageUpdate: <R>(handler: MessageUpdateHandler<R>) =>
				Effect.sync(() => {
					registry["messages.update"].add(handler)
				}),

			onMessageDelete: <R>(handler: MessageDeleteHandler<R>) =>
				Effect.sync(() => {
					registry["messages.delete"].add(handler)
				}),

			onChannelMemberAdded: <R>(handler: ChannelMemberAddedHandler<R>) =>
				Effect.sync(() => {
					registry["channel_members.insert"].add(handler)
				}),

			onChannelMemberRemoved: <R>(handler: ChannelMemberRemovedHandler<R>) =>
				Effect.sync(() => {
					registry["channel_members.delete"].add(handler)
				}),

			onChannelCreated: <R>(handler: ChannelCreatedHandler<R>) =>
				Effect.sync(() => {
					registry["channels.insert"].add(handler)
				}),

			onChannelUpdated: <R>(handler: ChannelUpdatedHandler<R>) =>
				Effect.sync(() => {
					registry["channels.update"].add(handler)
				}),

			onChannelDeleted: <R>(handler: ChannelDeletedHandler<R>) =>
				Effect.sync(() => {
					registry["channels.delete"].add(handler)
				}),

			start: Effect.gen(function* () {
				yield* Effect.log("Starting event dispatcher")

				// Start consumers for all event types
				const eventTypes: EventType[] = [
					"messages.insert",
					"messages.update",
					"messages.delete",
					"channel_members.insert",
					"channel_members.delete",
					"channels.insert",
					"channels.update",
					"channels.delete",
				]

				yield* Effect.forEach(eventTypes, consumeEvents, {
					concurrency: "unbounded",
				})

				yield* Effect.log("Event dispatcher started")
			}),
		}
	}),
}) {}
