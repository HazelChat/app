import { isChangeMessage, type Message, ShapeStream } from "@electric-sql/client"
import { Effect, type Scope, Stream } from "effect"
import type { ShapeStreamError } from "../errors.ts"
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

export interface ShapeStreamSubscriberConfig {
	readonly electricUrl: string

	readonly botToken: string

	readonly subscriptions: readonly ShapeSubscriptionConfig[]
}

/**
 * Service that subscribes to Electric SQL shape streams
 */
export class ShapeStreamSubscriber extends Effect.Service<ShapeStreamSubscriber>()("ShapeStreamSubscriber", {
	accessors: true,
	effect: Effect.fn(function* (config: ShapeStreamSubscriberConfig) {
		const queue = yield* ElectricEventQueue

		const createShapeStream = (
			subscription: ShapeSubscriptionConfig,
		): Stream.Stream<Message, ShapeStreamError> =>
			Stream.asyncPush<Message, ShapeStreamError>((emit) =>
				Effect.gen(function* () {
					yield* Effect.log(`Creating shape stream for table: ${subscription.table}`)

					const stream = new ShapeStream({
						url: config.electricUrl,
						params: {
							table: subscription.table,
							...(subscription.where && { where: subscription.where }),
							...(subscription.columns && {
								columns: subscription.columns as string[],
							}),
						},
						offset: !subscription.startFromNow ? undefined : "now",
						fetchClient: (input: string | URL | Request, init?: RequestInit) =>
							fetch(input, {
								...init,
								headers: {
									...init?.headers,
									Authorization: `Bearer ${config.botToken}`,
								},
							}),
					})

					const unsubscribe = stream.subscribe((messages) => {
						for (const message of messages) {
							emit.single(message)
						}
					})

					yield* Effect.addFinalizer(() =>
						Effect.gen(function* () {
							yield* Effect.log(`Unsubscribing from table: ${subscription.table}`)
							yield* Effect.sync(() => unsubscribe())
						}),
					)

					yield* Effect.log(`Shape stream subscription active for table: ${subscription.table}`)
				}),
			)

		return {
			start: Effect.gen(function* () {
				yield* Effect.log(
					`Starting shape stream subscriptions for ${config.subscriptions.length} tables`,
				)

				yield* Effect.forEach(
					config.subscriptions,
					(subscription) =>
						createShapeStream(subscription).pipe(
							Stream.filter(isChangeMessage),
							Stream.mapEffect((message) =>
								Effect.gen(function* () {
									const event: ElectricEvent = {
										operation: message.headers.operation as
											| "insert"
											| "update"
											| "delete",
										table: subscription.table,
										value: message.value as any,
										timestamp: new Date(),
									}

									yield* queue.offer(event)
								}),
							),
							Stream.runDrain,
							Effect.forkScoped,
						),
					{ concurrency: "unbounded" },
				)

				yield* Effect.log("All shape stream subscriptions started successfully")
			}),
		}
	}),
}) {}
