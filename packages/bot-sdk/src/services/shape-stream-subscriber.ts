import { isChangeMessage, type Message, ShapeStream } from "@electric-sql/client"
import { Effect, type Scope } from "effect"
import { ShapeStreamError } from "../errors.ts"
import type { ElectricEvent } from "../types/events.ts"
import { ElectricEventQueue } from "./electric-event-queue.ts"

/**
 * Configuration for a shape stream subscription
 */
export interface ShapeSubscriptionConfig {
	/**
	 * Table name to subscribe to
	 */
	readonly table: string

	/**
	 * Optional WHERE clause for filtering
	 */
	readonly where?: string

	/**
	 * Optional column selection
	 */
	readonly columns?: readonly string[]

	/**
	 * Start from current position (ignore historical data)
	 * @default true
	 */
	readonly startFromNow?: boolean
}

/**
 * Configuration for the shape stream subscriber
 */
export interface ShapeStreamSubscriberConfig {
	/**
	 * Electric proxy URL
	 */
	readonly electricUrl: string

	/**
	 * Bot authentication token
	 */
	readonly botToken: string

	/**
	 * Tables to subscribe to
	 */
	readonly subscriptions: readonly ShapeSubscriptionConfig[]
}

/**
 * Service that subscribes to Electric SQL shape streams
 */
export class ShapeStreamSubscriber extends Effect.Service<ShapeStreamSubscriber>()("ShapeStreamSubscriber", {
	accessors: true,
	effect: Effect.fn(function* (config: ShapeStreamSubscriberConfig) {
		const queue = yield* ElectricEventQueue

		// Helper to create a shape stream subscription
		const subscribe = (
			subscription: ShapeSubscriptionConfig,
		): Effect.Effect<() => void, ShapeStreamError, Scope.Scope> =>
			Effect.gen(function* () {
				// Create shape stream
				const stream = new ShapeStream({
					url: config.electricUrl,
					params: {
						table: subscription.table,
						...(subscription.where && { where: subscription.where }),
						...(subscription.columns && {
							columns: subscription.columns as string[],
						}),
					},
					offset: subscription.startFromNow === false ? undefined : "-1",
					fetchClient: (input: string | URL | Request, init?: RequestInit) =>
						fetch(input, {
							...init,
							headers: {
								...init?.headers,
								Authorization: `Bearer ${config.botToken}`,
							},
						}),
				})

				console.log("STREAM", stream)

				// Subscribe to stream messages
				const unsubscribe = stream.subscribe((messages: Message[]) => {
					console.log("MESSAGES", messages)
					// Process messages in Effect context
					const processMessages = Effect.gen(function* () {
						for (const message of messages) {
							// Only process change messages (ignore control messages)
							if (!isChangeMessage(message)) {
								continue
							}

							// Create event from message
							const event: ElectricEvent = {
								operation: message.headers.operation as "insert" | "update" | "delete",
								table: subscription.table,
								value: message.value as any,
								timestamp: new Date(),
							}

							// Offer event to queue
							yield* queue.offer(event)
						}
					})

					// Fork effect to process messages asynchronously
					Effect.runFork(
						processMessages.pipe(
							Effect.catchAll((error) =>
								Effect.logError("Failed to process shape stream messages", {
									error,
									table: subscription.table,
								}),
							),
						),
					)
				})

				// Register cleanup on scope close
				yield* Effect.addFinalizer(() =>
					Effect.sync(() => {
						unsubscribe()
					}),
				)

				return unsubscribe
			}).pipe(
				Effect.catchAll((error) =>
					Effect.fail(
						new ShapeStreamError({
							message: `Failed to subscribe to shape stream`,
							table: subscription.table,
							cause: error,
						}),
					),
				),
			)

		return {
			start: Effect.gen(function* () {
				yield* Effect.log(
					`Starting shape stream subscriptions for ${config.subscriptions.length} tables`,
				)

				// Subscribe to all configured tables
				yield* Effect.forEach(
					config.subscriptions,
					(subscription) =>
						Effect.gen(function* () {
							yield* Effect.log(`Subscribing to table: ${subscription.table}`)
							yield* subscribe(subscription)
							yield* Effect.log(`Successfully subscribed to table: ${subscription.table}`)
						}),
					{ concurrency: "unbounded" },
				)

				yield* Effect.log("All shape stream subscriptions started")
			}),
		}
	}),
}) {}
