import type { Schema } from "effect"
import type { ShapeSubscriptionConfig } from "../services/shape-stream-subscriber.ts"
import type { EventType } from "./events.ts"

/**
 * Extract the schema type from a subscription config
 */
export type ExtractSchemaType<S> = S extends ShapeSubscriptionConfig<infer A, any, any> ? A : never

/**
 * Generate event types for a subscription (table.operation)
 */
export type GenerateEventTypes<S extends ShapeSubscriptionConfig> = S extends ShapeSubscriptionConfig<
	infer A,
	any,
	any
>
	? S["table"] extends string
		? `${S["table"]}.${"insert" | "update" | "delete"}`
		: never
	: never

/**
 * Map all subscriptions to their event types
 */
export type SubscriptionEventTypes<Subs extends readonly ShapeSubscriptionConfig[]> = {
	[K in keyof Subs]: GenerateEventTypes<Subs[K]>
}[number]

/**
 * Create a mapping from event type to schema type
 */
export type EventSchemaMap<Subs extends readonly ShapeSubscriptionConfig[]> = {
	[K in SubscriptionEventTypes<Subs>]: ExtractSchemaTypeForEvent<Subs, K>
}

/**
 * Extract schema type for a specific event type from subscriptions
 */
export type ExtractSchemaTypeForEvent<
	Subs extends readonly ShapeSubscriptionConfig[],
	E extends EventType,
> = E extends `${infer Table}.${infer _Op}`
	? ExtractSchemaType<Extract<Subs[number], { table: Table }>>
	: never
