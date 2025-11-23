import { Effect, Layer, ManagedRuntime, Schema } from "effect"
import { BotAuth, createAuthContextFromToken } from "./auth.ts"
import { BotClient } from "./bot-client.ts"
import { BotConfig } from "./config.ts"
import { ElectricEventQueue, EventDispatcher, ShapeStreamSubscriber } from "./services/index.ts"

/**
 * Create the full bot runtime from configuration
 */
export const makeBotRuntime = (config: BotConfig) => {
	// Create layers with configuration
	const EventQueueLayer = ElectricEventQueue.Default(
		config.queueConfig ?? {
			capacity: 1000,
			backpressureStrategy: "sliding",
		},
	)

	const ShapeSubscriberLayer = ShapeStreamSubscriber.Default({
		electricUrl: config.electricUrl,
		botToken: config.botToken,
		subscriptions: config.subscriptions ?? [],
	})

	const EventDispatcherLayer = EventDispatcher.Default(
		config.dispatcherConfig ?? {
			maxRetries: 3,
			retryBaseDelay: 100,
		},
	)

	const AuthLayer = Layer.unwrapEffect(
		createAuthContextFromToken(config.botToken).pipe(Effect.map((context) => BotAuth.Default(context))),
	)

	// Manually compose all layers with proper dependency order
	// 1. EventQueue has no dependencies
	// 2. EventDispatcher and ShapeStreamSubscriber need EventQueue
	// 3. BotClient needs EventDispatcher, ShapeStreamSubscriber, and BotAuth
	const AllLayers = BotClient.Default.pipe(
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
 * Helper to create bot runtime with minimal config
 */
export const createBotRuntime = (options: { electricUrl: string; botToken: string }) => {
	const config = new BotConfig({
		electricUrl: options.electricUrl,
		botToken: options.botToken,
		subscriptions: [
			{
				table: "messages",
				startFromNow: true,
			},
			{
				table: "channels",
				startFromNow: true,
			},
			{
				table: "channel_members",
				startFromNow: true,
			},
		],
		queueConfig: {
			capacity: 1000,
			backpressureStrategy: "sliding",
		},
		dispatcherConfig: {
			maxRetries: 3,
			retryBaseDelay: 100,
		},
	})

	return makeBotRuntime(config)
}
