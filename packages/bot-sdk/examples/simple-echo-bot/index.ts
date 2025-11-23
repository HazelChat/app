#!/usr/bin/env bun

/**
 * Simple Echo Bot Example
 *
 * This example demonstrates the basic usage of the @hazel/bot-sdk.
 * It listens for new messages and logs them to the console.
 *
 * Features demonstrated:
 * - Bot authentication
 * - Connecting to Electric SQL
 * - Listening for message events
 * - Error handling
 * - Graceful shutdown
 */

import { Effect } from "effect"
import { BotClient, createBotRuntime } from "../../src"

/**
 * Load configuration from environment variables
 */
const config = {
	electricUrl: process.env.ELECTRIC_URL ?? "http://localhost:8787/v1/shape",
	botToken: process.env.BOT_TOKEN,
}

/**
 * Validate that required environment variables are present
 */
if (!config.botToken) {
	console.error("Error: BOT_TOKEN environment variable is required")
	console.error("Please copy .env.example to .env and fill in your bot token")
	process.exit(1)
}

/**
 * Create the bot runtime with configuration
 */
const runtime = createBotRuntime({
	electricUrl: config.electricUrl,
	botToken: config.botToken,
})

/**
 * Define the bot program
 *
 * This is where you define what your bot does.
 * The program is an Effect that:
 * 1. Gets the BotClient from the context
 * 2. Registers event handlers
 * 3. Starts the bot
 * 4. Keeps running until interrupted
 */
const program = Effect.gen(function* () {
	// Get the BotClient service from the Effect context
	const bot = yield* BotClient

	// Log startup
	yield* Effect.log("Starting Simple Echo Bot...")

	// Register a handler for new messages
	// The handler will be called for every new message in the organization
	yield* bot.onMessage((message) =>
		Effect.gen(function* () {
			// Log the message details
			yield* Effect.log("📨 New message received:")
			yield* Effect.log(`  Author ID: ${message.authorId}`)
			yield* Effect.log(`  Channel ID: ${message.channelId}`)
			yield* Effect.log(`  Content: ${message.content}`)
			yield* Effect.log(`  Created at: ${message.createdAt}`)

			// TODO: In a future version with RPC integration, you could respond here:
			// const rpc = yield* HazelRpcClient
			// yield* rpc("message.create", {
			//   channelId: message.channelId,
			//   content: `Echo: ${message.content}`
			// })
		}),
	)

	// Start the bot (begins listening for events)
	// This must be called after registering all handlers
	yield* bot.start

	yield* Effect.log("✅ Bot is now running and listening for messages!")
	yield* Effect.log("Press Ctrl+C to stop")

	// Keep the bot running
	// The bot will continue to process events until the program is interrupted
	return yield* Effect.never
})

/**
 * Handle graceful shutdown
 *
 * When the user presses Ctrl+C, we want to:
 * 1. Log that we're shutting down
 * 2. Let the Effect runtime clean up resources
 * 3. Exit cleanly
 */
const shutdown = Effect.gen(function* () {
	yield* Effect.log("\n👋 Shutting down bot...")
	yield* Effect.log("Cleaning up resources...")
	// The Effect runtime will automatically clean up resources
	// because we're running the program with Effect.scoped
	yield* Effect.sleep("100 millis")
	yield* Effect.log("✅ Shutdown complete")
	process.exit(0)
})

/**
 * Set up signal handlers for graceful shutdown
 */
process.on("SIGINT", () => {
	runtime.runFork(shutdown)
})

process.on("SIGTERM", () => {
	runtime.runFork(shutdown)
})

runtime.runPromise(program.pipe(Effect.scoped))
