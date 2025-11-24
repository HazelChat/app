import { isChangeMessage, type Message, ShapeStream } from "@electric-sql/client"
import { Config, Effect, Layer, Schema, type Scope, Stream } from "effect"
import type { ConfigError } from "effect"
import type { ShapeStreamError } from "../errors.ts"
import type { ElectricEvent } from "../types/events.ts"
import { ElectricEventQueue } from "./electric-event-queue.ts"

/**
 * Configuration for a shape stream subscription
 */
export interface ShapeSubscriptionConfig<A = any, I = any, R = never> {
	/**
	 * Table name to subscribe to
	 */
	readonly table: string

	/**
	 * Schema for runtime validation and type safety
	 */
	readonly schema: Schema.Schema<A, I, R>

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
					yield* Effect.logInfo(`Creating shape stream`, {
						table: subscription.table,
						where: subscription.where,
						columns: subscription.columns?.join(", "),
					}).pipe(
						Effect.annotateLogs("service", "ShapeStreamSubscriber"),
					)

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
							yield* Effect.logInfo(`Unsubscribing from shape stream`, {
								table: subscription.table,
							}).pipe(
								Effect.annotateLogs("service", "ShapeStreamSubscriber"),
							)
							yield* Effect.sync(() => unsubscribe())
						}),
					)

					yield* Effect.logInfo(`Shape stream subscription active`, {
						table: subscription.table,
					}).pipe(
						Effect.annotateLogs("service", "ShapeStreamSubscriber"),
					)
				}),
			)

		return {
			start: Effect.gen(function* () {
				yield* Effect.logInfo(
					`Starting shape stream subscriptions`,
					{
						tablesCount: config.subscriptions.length,
						tables: config.subscriptions.map((s) => s.table).join(", "),
					},
				).pipe(
					Effect.annotateLogs("service", "ShapeStreamSubscriber"),
				)

				yield* Effect.forEach(
					config.subscriptions,
					(subscription) =>
						createShapeStream(subscription).pipe(
							Stream.filter(isChangeMessage),
							Stream.mapEffect((message) =>
								Effect.gen(function* () {
									// Parse and validate the value using the subscription's schema
									const parseResult = yield* Schema.decodeUnknown(subscription.schema)(
										message.value,
									).pipe(
										Effect.catchAll((error) =>
											Effect.gen(function* () {
												yield* Effect.logError("Schema validation failed", {
													table: subscription.table,
													operation: message.headers.operation,
													error: error.message,
												}).pipe(
													Effect.annotateLogs("service", "ShapeStreamSubscriber"),
												)
												// Return Effect.fail to skip this message
												return yield* Effect.fail(error)
											}),
										),
									)

									// Create typed event with validated data
									const event: ElectricEvent = {
										operation: message.headers.operation as
											| "insert"
											| "update"
											| "delete",
										table: subscription.table,
										value: parseResult,
										timestamp: new Date(),
									}

									yield* queue.offer(event)
								}),
							),
							// Filter out failed validations (continue on error)
							Stream.catchAll(() => Stream.empty),
							Stream.runDrain,
							Effect.forkScoped,
						),
					{ concurrency: "unbounded" },
				)

				yield* Effect.logInfo("All shape stream subscriptions started successfully").pipe(
					Effect.annotateLogs("service", "ShapeStreamSubscriber"),
				)
			}),
		}
	}),
}) {
	/**
	 * Create a layer from Effect Config
	 */
	static readonly layerConfig = (
		config: Config.Config.Wrap<ShapeStreamSubscriberConfig>,
	): Layer.Layer<ShapeStreamSubscriber, ConfigError.ConfigError, ElectricEventQueue> =>
		Layer.unwrapEffect(
			Config.unwrap(config).pipe(Effect.map((cfg) => ShapeStreamSubscriber.Default(cfg))),
		)
}
