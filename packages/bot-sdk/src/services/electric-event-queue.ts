import type { ConfigError } from "effect"
import { Config, Effect, Layer, Metric, Queue } from "effect"
import { QueueError } from "../errors.ts"
import type { ElectricEvent, EventType } from "../types/events.ts"

/**
 * Configuration for the event queue
 */
export interface EventQueueConfig {
	/**
	 * Maximum number of events to buffer per event type
	 * @default 1000
	 */
	readonly capacity: number

	/**
	 * Strategy when queue is full
	 * - "drop-oldest": Remove oldest event and add new one
	 * - "drop-newest": Ignore new event
	 * - "sliding": Use sliding queue (drops oldest automatically)
	 * @default "sliding"
	 */
	readonly backpressureStrategy: "drop-oldest" | "drop-newest" | "sliding"
}

/**
 * Default queue configuration
 */
export const defaultEventQueueConfig: EventQueueConfig = {
	capacity: 1000,
	backpressureStrategy: "sliding",
}

/**
 * Service that manages Effect queues for different event types
 */
export class ElectricEventQueue extends Effect.Service<ElectricEventQueue>()("ElectricEventQueue", {
	accessors: true,
	effect: Effect.fn(function* (config: EventQueueConfig) {
		// Create a queue for each event type
		const queues = new Map<EventType, Queue.Queue<ElectricEvent>>()

		// Helper to get event type from event
		const getEventTypeFromEvent = (event: ElectricEvent): EventType => {
			return `${event.table}.${event.operation}` as EventType
		}

		// Helper to get or create queue for event type
		const getQueue = (eventType: EventType): Effect.Effect<Queue.Queue<ElectricEvent>, QueueError> =>
			Effect.gen(function* () {
				const existing = queues.get(eventType)
				if (existing) {
					return existing
				}

				yield* Effect.logInfo(`Creating queue`, {
					eventType,
					capacity: config.capacity,
					backpressureStrategy: config.backpressureStrategy,
				}).pipe(
					Effect.annotateLogs("service", "ElectricEventQueue"),
				)

				const queue = yield* (
					config.backpressureStrategy === "sliding"
						? Queue.sliding<ElectricEvent>(config.capacity)
						: Queue.bounded<ElectricEvent>(config.capacity)
				).pipe(
					Effect.catchAll((error) =>
						Effect.fail(
							new QueueError({
								message: `Failed to create queue for event type: ${eventType}`,
								cause: error,
							}),
						),
					),
				)

				queues.set(eventType, queue)
				return queue
			})

		return {
			offer: Effect.fn(function* (event: ElectricEvent) {
				const eventType = getEventTypeFromEvent(event)
				const queue = yield* getQueue(eventType)

				// Offer to queue
				const offered = yield* Queue.offer(queue, event).pipe(
					Effect.catchAll((error) =>
						Effect.fail(
							new QueueError({
								message: `Failed to offer event to queue: ${eventType}`,
								cause: error,
							}),
						),
					),
				)

				// Handle backpressure for bounded queues
				if (!offered && config.backpressureStrategy === "drop-oldest") {
					yield* Effect.logWarning(`Queue full, dropping oldest event`, {
						eventType,
					}).pipe(
						Effect.annotateLogs("service", "ElectricEventQueue"),
					)

					// Track dropped events
					const droppedEvents = Metric.counter("bot_queue_events_dropped")
					yield* Metric.increment(droppedEvents).pipe(
						Effect.tagMetrics("event_type", eventType),
					)

					// Take one from queue and try again
					yield* Queue.take(queue).pipe(Effect.ignore)
					yield* Queue.offer(queue, event).pipe(
						Effect.catchAll((error) =>
							Effect.fail(
								new QueueError({
									message: `Failed to offer event after dropping oldest: ${eventType}`,
									cause: error,
								}),
							),
						),
					)
				}

				// Track enqueued events
				const enqueuedEvents = Metric.counter("bot_queue_events_enqueued")
				yield* Metric.increment(enqueuedEvents).pipe(
					Effect.tagMetrics("event_type", eventType),
				)

				// Update queue size gauge
				const queueSize = yield* Queue.size(queue)
				const queueSizeGauge = Metric.gauge("bot_queue_size")
				yield* Metric.set(queueSizeGauge, queueSize).pipe(
					Effect.tagMetrics("event_type", eventType),
				)
			}),

			take: (eventType: EventType) =>
				Effect.gen(function* () {
					const queue = yield* getQueue(eventType)
					const event = yield* Queue.take(queue).pipe(
						Effect.catchAll((error) =>
							Effect.fail(
								new QueueError({
									message: `Failed to take event from queue: ${eventType}`,
									cause: error,
								}),
							),
						),
					)

					// Track dequeued events
					const dequeuedEvents = Metric.counter("bot_queue_events_dequeued")
					yield* Metric.increment(dequeuedEvents).pipe(
						Effect.tagMetrics("event_type", eventType),
					)

					// Update queue size gauge
					const queueSize = yield* Queue.size(queue)
					const queueSizeGauge = Metric.gauge("bot_queue_size")
					yield* Metric.set(queueSizeGauge, queueSize).pipe(
						Effect.tagMetrics("event_type", eventType),
					)

					return event
				}),

			poll: (eventType: EventType) =>
				Effect.gen(function* () {
					const queue = yield* getQueue(eventType)
					return yield* Queue.poll(queue).pipe(
						Effect.map((option) => (option._tag === "Some" ? option.value : null)),
						Effect.catchAll((error) =>
							Effect.fail(
								new QueueError({
									message: `Failed to poll event from queue: ${eventType}`,
									cause: error,
								}),
							),
						),
					)
				}),

			size: (eventType: EventType) =>
				Effect.gen(function* () {
					const queue = yield* getQueue(eventType)
					return yield* Queue.size(queue).pipe(
						Effect.catchAll((error) =>
							Effect.fail(
								new QueueError({
									message: `Failed to get queue size: ${eventType}`,
									cause: error,
								}),
							),
						),
					)
				}),

			shutdown: Effect.gen(function* () {
				yield* Effect.logInfo(`Shutting down queues`, {
					queueCount: queues.size,
				}).pipe(
					Effect.annotateLogs("service", "ElectricEventQueue"),
				)

				// Shutdown all queues
				yield* Effect.forEach(
					Array.from(queues.values()),
					(queue) =>
						Queue.shutdown(queue).pipe(
							Effect.catchAll((error) =>
								Effect.fail(
									new QueueError({
										message: "Failed to shutdown queue",
										cause: error,
									}),
								),
							),
						),
					{ concurrency: "unbounded" },
				)
				queues.clear()

				yield* Effect.logInfo("All queues shutdown successfully").pipe(
					Effect.annotateLogs("service", "ElectricEventQueue"),
				)
			}),
		}
	}),
}) {
	/**
	 * Create a layer from Effect Config
	 */
	static readonly layerConfig = (
		config: Config.Config.Wrap<EventQueueConfig>,
	): Layer.Layer<ElectricEventQueue, ConfigError.ConfigError> =>
		Layer.unwrapEffect(Config.unwrap(config).pipe(Effect.map((cfg) => ElectricEventQueue.Default(cfg))))
}
