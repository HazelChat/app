import { Schema } from "effect"
import type { EventDispatcherConfig, EventQueueConfig, ShapeSubscriptionConfig } from "./services/index.ts"

/**
 * Bot client configuration schema
 */
export class BotConfig extends Schema.Class<BotConfig>("BotConfig")({
	/**
	 * Electric proxy URL
	 * @example "http://localhost:8787/v1/shape"
	 * @example "https://electric-proxy.example.workers.dev/v1/shape"
	 */
	electricUrl: Schema.String,

	/**
	 * Bot authentication token
	 */
	botToken: Schema.String,

	/**
	 * Tables to subscribe to for events
	 * @default All tables (messages, channels, channel_members)
	 */
	subscriptions: Schema.optional(
		Schema.Array(
			Schema.Struct({
				table: Schema.String,
				where: Schema.optional(Schema.String),
				columns: Schema.optional(Schema.Array(Schema.String)),
				startFromNow: Schema.optional(Schema.Boolean),
			}),
		),
	),

	/**
	 * Event queue configuration
	 */
	queueConfig: Schema.optional(
		Schema.Struct({
			capacity: Schema.Number,
			backpressureStrategy: Schema.Literal("drop-oldest", "drop-newest", "sliding"),
		}),
	),

	/**
	 * Event dispatcher configuration
	 */
	dispatcherConfig: Schema.optional(
		Schema.Struct({
			maxRetries: Schema.Number,
			retryBaseDelay: Schema.Number,
		}),
	),
}) {}

/**
 * Default subscriptions for a bot
 */
export const defaultSubscriptions = (): readonly ShapeSubscriptionConfig[] => [
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
]

/**
 * Default queue configuration
 */
export const defaultQueueConfig: EventQueueConfig = {
	capacity: 1000,
	backpressureStrategy: "sliding",
}

/**
 * Default dispatcher configuration
 */
export const defaultDispatcherConfig: EventDispatcherConfig = {
	maxRetries: 3,
	retryBaseDelay: 100,
}

/**
 * Helper to create bot config with defaults
 */
export const createBotConfig = (
	config: Pick<BotConfig, "electricUrl" | "botToken"> &
		Partial<Omit<BotConfig, "electricUrl" | "botToken">>,
): BotConfig => {
	return new BotConfig({
		electricUrl: config.electricUrl,
		botToken: config.botToken,
		subscriptions: config.subscriptions ?? defaultSubscriptions(),
		queueConfig: config.queueConfig ?? defaultQueueConfig,
		dispatcherConfig: config.dispatcherConfig ?? defaultDispatcherConfig,
	})
}
