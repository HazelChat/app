import { Config, Effect, Layer, ManagedRuntime, Schema } from "effect"
import { BotAuth, createAuthContextFromToken } from "./auth.ts"
import { createBotClientLayer, createBotClientTag, type TypedBotClient } from "./bot-client.ts"
import type { BotConfig } from "./config.ts"
import type { ShapeSubscriptionConfig } from "./services/shape-stream-subscriber.ts"
import { ElectricEventQueue, EventDispatcher, ShapeStreamSubscriber } from "./services/index.ts"

/**
 * Create the full bot runtime from configuration with strongly typed subscriptions
 */
export const makeBotRuntime = <const Subs extends readonly ShapeSubscriptionConfig[]>(
	config: BotConfig & { subscriptions: Subs },
): ManagedRuntime.ManagedRuntime<TypedBotClient<Subs>, unknown> => {
	// Create layers using layerConfig pattern
	const EventQueueLayer = ElectricEventQueue.layerConfig(
		Config.succeed(
			config.queueConfig ?? {
				capacity: 1000,
				backpressureStrategy: "sliding" as const,
			},
		),
	)

	const ShapeSubscriberLayer = ShapeStreamSubscriber.layerConfig(
		Config.succeed({
			electricUrl: config.electricUrl,
			botToken: config.botToken,
			subscriptions: config.subscriptions ?? [],
		}),
	)

	const EventDispatcherLayer = EventDispatcher.layerConfig(
		Config.succeed(
			config.dispatcherConfig ?? {
				maxRetries: 3,
				retryBaseDelay: 100,
			},
		),
	)

	const AuthLayer = Layer.unwrapEffect(
		createAuthContextFromToken(config.botToken).pipe(Effect.map((context) => BotAuth.Default(context))),
	)

	const BotClientLayer = createBotClientLayer<Subs>()

	// Manually compose all layers with proper dependency order
	// 1. EventQueue has no dependencies
	// 2. EventDispatcher and ShapeStreamSubscriber need EventQueue
	// 3. BotClient needs EventDispatcher, ShapeStreamSubscriber, and BotAuth
	const AllLayers = BotClientLayer.pipe(
		Layer.provide(
			Layer.mergeAll(
				Layer.provide(EventDispatcherLayer, EventQueueLayer),
				Layer.provide(ShapeSubscriberLayer, EventQueueLayer),
				AuthLayer,
			),
		),
	)

	// Create runtime
	return ManagedRuntime.make(AllLayers)
}

/**
 * Helper to create bot runtime with config
 * Subscriptions with schemas are required for type safety
 */
export const createBotRuntime = <const Subs extends readonly ShapeSubscriptionConfig[]>(
	config: BotConfig & { subscriptions: Subs },
) => {
	return makeBotRuntime(config)
}
