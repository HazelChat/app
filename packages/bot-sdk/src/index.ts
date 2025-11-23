/**
 * @hazel/bot-sdk
 *
 * Effect-based SDK for building bots that interact with the application via Electric SQL streams
 *
 * ## Quick Start (Hazel Integrations)
 *
 * For building Hazel chat app integrations, use the HazelBotSDK:
 *
 * ```typescript
 * import { createHazelBot, HazelBotClient } from "@hazel/bot-sdk"
 *
 * const runtime = createHazelBot({
 *   electricUrl: process.env.ELECTRIC_URL!,
 *   botToken: process.env.BOT_TOKEN!,
 * })
 *
 * const program = Effect.gen(function* () {
 *   const bot = yield* HazelBotClient
 *   yield* bot.onMessage((message) => {
 *     console.log("New message:", message.content)
 *   })
 *   yield* bot.start
 * })
 * ```
 *
 * ## Advanced Usage (Custom Schemas)
 *
 * For generic Electric SQL integrations with custom schemas:
 *
 * ```typescript
 * import { makeBotRuntime, createBotClientTag } from "@hazel/bot-sdk"
 *
 * const subscriptions = [
 *   { table: "users", schema: UserSchema, startFromNow: true },
 * ] as const
 *
 * const runtime = makeBotRuntime({ electricUrl, botToken, subscriptions })
 * const BotClient = createBotClientTag<typeof subscriptions>()
 * ```
 */

// Generic bot SDK (for custom schemas and advanced use cases)
export * from "./auth.ts"
export * from "./bot-client.ts"
export * from "./config.ts"
export * from "./errors.ts"
// Hazel-specific convenience layer (recommended for Hazel integrations)
export * from "./hazel-bot-sdk.ts"
export * from "./layers.ts"
export * from "./services/index.ts"
export * from "./types/index.ts"
