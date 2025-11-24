import { Effect, Metric } from "effect"
import type { EventType } from "./types/events.ts"

/**
 * Middleware function that wraps event handler execution
 * @template A - The event data type
 * @template E - The error type
 * @template R - The required context/services
 */
export type Middleware<A = any, E = any, R = never> = (
	event: A,
	eventType: EventType,
	next: Effect.Effect<void, E, R>,
) => Effect.Effect<void, E, R>

/**
 * Configuration for middleware
 */
export interface MiddlewareConfig {
	/**
	 * Middleware to apply to handlers
	 */
	readonly middleware?: readonly Middleware[]
}

/**
 * Compose multiple middleware into a single middleware
 */
export const composeMiddleware = <A = any, E = any, R = never>(
	middleware: readonly Middleware<A, E, R>[],
): Middleware<A, E, R> => {
	if (middleware.length === 0) {
		return (_, __, next) => next
	}

	return (event, eventType, next) => {
		const composed = middleware.reduceRight(
			(acc, mw) => mw(event, eventType, acc),
			next,
		)
		return composed
	}
}

/**
 * Logging middleware - logs before and after handler execution
 */
export const loggingMiddleware: Middleware = (_event, eventType, next) =>
	Effect.gen(function* () {
		yield* Effect.logInfo(`Handler starting`, {
			eventType,
		}).pipe(Effect.annotateLogs("middleware", "logging"))

		const startTime = performance.now()

		yield* next

		const duration = performance.now() - startTime

		yield* Effect.logInfo(`Handler completed`, {
			eventType,
			duration: `${duration.toFixed(2)}ms`,
		}).pipe(Effect.annotateLogs("middleware", "logging"))
	})

/**
 * Metrics middleware - tracks handler execution metrics
 */
export const metricsMiddleware: Middleware = (_event, eventType, next) =>
	Effect.gen(function* () {
		const startTime = performance.now()

		// Increment event counter
		const eventsReceived = Metric.counter("bot_events_received")
		yield* Metric.increment(eventsReceived).pipe(
			Effect.tagMetrics("event_type", eventType),
		)

		// Execute handler
		const result = yield* Effect.either(next)

		const duration = performance.now() - startTime

		// Log duration (metrics collection can be added separately if needed)
		yield* Effect.logDebug(`Handler execution time: ${duration.toFixed(2)}ms`, {
			eventType,
			duration,
		})

		// Track success/failure
		if (result._tag === "Left") {
			const handlerErrors = Metric.counter("bot_handler_errors")
			yield* Metric.increment(handlerErrors).pipe(
				Effect.tagMetrics("event_type", eventType),
			)
			return yield* Effect.fail(result.left)
		}

		const handlerSuccess = Metric.counter("bot_handler_success")
		yield* Metric.increment(handlerSuccess).pipe(
			Effect.tagMetrics("event_type", eventType),
		)
	})

/**
 * Error tracking middleware - provides detailed error context
 */
export const errorTrackingMiddleware: Middleware = (_event, eventType, next) =>
	next.pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				yield* Effect.logError(`Handler error`, {
					eventType,
					error,
					errorType: typeof error === "object" && error !== null && "_tag" in error
						? error._tag
						: "unknown",
				}).pipe(
					Effect.annotateLogs("middleware", "errorTracking"),
				)

				return yield* Effect.fail(error)
			}),
		),
	)

/**
 * Combine common middleware (logging + metrics + error tracking)
 */
export const defaultMiddleware: readonly Middleware[] = [
	loggingMiddleware,
	metricsMiddleware,
	errorTrackingMiddleware,
] as const
