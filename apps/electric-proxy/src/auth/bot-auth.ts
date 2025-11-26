import { and, Database, eq, isNull, schema } from "@hazel/db"
import type { BotId, ChannelId, UserId } from "@hazel/schema"
import { Effect, Option, Schema } from "effect"

/**
 * Pre-queried access context for bot WHERE clause generation
 */
export interface BotAccessContext {
	channelIds: readonly ChannelId[]
}

/**
 * Authenticated bot context
 */
export interface AuthenticatedBot {
	botId: BotId
	userId: UserId
	accessContext: BotAccessContext
}

/**
 * Bot authentication error
 */
export class BotAuthenticationError extends Schema.TaggedError<BotAuthenticationError>(
	"BotAuthenticationError",
)("BotAuthenticationError", {
	message: Schema.String,
	detail: Schema.optional(Schema.String),
}) {}

/**
 * Hash a token using SHA-256 (Web Crypto API - available in Bun)
 */
async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(token)
	const hashBuffer = await crypto.subtle.digest("SHA-256", data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Validate a Bearer token for bot authentication.
 *
 * Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Hash token with SHA-256
 * 3. Query bots table by apiTokenHash
 * 4. Query channel_members for bot's userId
 * 5. Return AuthenticatedBot with channel access context
 */
export const validateBotToken = Effect.fn("ElectricProxy.validateBotToken")(function* (request: Request) {
	// Extract Bearer token from Authorization header
	const authHeader = request.headers.get("Authorization")
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return yield* Effect.fail(
			new BotAuthenticationError({
				message: "Missing or invalid Authorization header",
				detail: "Expected 'Bearer <token>'",
			}),
		)
	}

	const token = authHeader.slice(7) // Remove "Bearer " prefix

	// Hash the token
	const tokenHash = yield* Effect.promise(() => hashToken(token))

	// Query bot by token hash
	const db = yield* Database.Database
	const botOption = yield* db
		.execute((client) =>
			client
				.select({
					id: schema.botsTable.id,
					userId: schema.botsTable.userId,
				})
				.from(schema.botsTable)
				.where(and(eq(schema.botsTable.apiTokenHash, tokenHash), isNull(schema.botsTable.deletedAt)))
				.limit(1),
		)
		.pipe(
			Effect.map((results) => Option.fromNullable(results[0])),
			Effect.mapError(
				(error) =>
					new BotAuthenticationError({
						message: "Failed to lookup bot in database",
						detail: String(error),
					}),
			),
		)

	if (Option.isNone(botOption)) {
		return yield* Effect.fail(
			new BotAuthenticationError({
				message: "Invalid bot token",
				detail: "No bot found with this token",
			}),
		)
	}

	const bot = botOption.value

	// Query channel memberships for the bot's userId
	const channelMembers = yield* db
		.execute((client) =>
			client
				.select({ channelId: schema.channelMembersTable.channelId })
				.from(schema.channelMembersTable)
				.where(
					and(
						eq(schema.channelMembersTable.userId, bot.userId),
						isNull(schema.channelMembersTable.deletedAt),
					),
				),
		)
		.pipe(
			Effect.mapError(
				(error) =>
					new BotAuthenticationError({
						message: "Failed to query bot's channels",
						detail: String(error),
					}),
			),
		)

	const channelIds = channelMembers.map((m) => m.channelId)

	return {
		botId: bot.id,
		userId: bot.userId,
		accessContext: {
			channelIds,
		},
	} satisfies AuthenticatedBot
})
