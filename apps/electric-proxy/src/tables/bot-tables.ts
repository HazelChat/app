import { and, isNull, schema } from "@hazel/db"
import { Effect, Match, Schema } from "effect"
import type { AuthenticatedBot } from "../auth/bot-auth"
import { buildWhereClause, inArraySorted, type WhereClauseResult } from "./where-clause-builder"

/**
 * Error thrown when bot table access is denied or where clause cannot be generated
 */
export class BotTableAccessError extends Schema.TaggedError<BotTableAccessError>()("BotTableAccessError", {
	message: Schema.String,
	detail: Schema.optional(Schema.String),
	table: Schema.String,
}) {}

/**
 * Tables that bots can access through the Electric proxy.
 * This is a restricted subset - more tables can be added as needed.
 */
export const BOT_ALLOWED_TABLES = [
	"messages",
	// Future: "channels", "attachments", "channel_members", etc.
] as const

export type BotAllowedTable = (typeof BOT_ALLOWED_TABLES)[number]

/**
 * Check if a table name is allowed for bots
 */
export function isBotTableAllowed(table: string): table is BotAllowedTable {
	return BOT_ALLOWED_TABLES.includes(table as BotAllowedTable)
}

/**
 * Validate that a table parameter is present and allowed for bots
 */
export function validateBotTable(table: string | null): {
	valid: boolean
	table?: BotAllowedTable
	error?: string
} {
	if (!table) {
		return {
			valid: false,
			error: "Missing required parameter: table",
		}
	}

	if (!isBotTableAllowed(table)) {
		return {
			valid: false,
			error: `Table '${table}' is not allowed for bots. Allowed tables: ${BOT_ALLOWED_TABLES.join(", ")}`,
		}
	}

	return {
		valid: true,
		table: table as BotAllowedTable,
	}
}

/**
 * Get the WHERE clause for a table based on the authenticated bot.
 * This ensures bots can only access data from channels they're installed in.
 *
 * Uses Drizzle's QueryBuilder for type-safe WHERE clause generation with
 * parameterized queries.
 *
 * @param table - The table name
 * @param bot - The authenticated bot context
 * @returns Effect that succeeds with WhereClauseResult or fails with BotTableAccessError
 */
export function getBotWhereClauseForTable(
	table: BotAllowedTable,
	bot: AuthenticatedBot,
): Effect.Effect<WhereClauseResult, BotTableAccessError> {
	return Match.value(table).pipe(
		Match.when("messages", () =>
			// Messages only from channels the bot is a member of
			Effect.succeed(
				buildWhereClause(
					schema.messagesTable,
					and(
						inArraySorted(schema.messagesTable.channelId, bot.accessContext.channelIds),
						isNull(schema.messagesTable.deletedAt),
					),
				),
			),
		),

		// Future tables can be added here:
		// Match.when("channels", () =>
		// 	Effect.succeed(
		// 		buildWhereClause(
		// 			schema.channelsTable,
		// 			and(
		// 				inArraySorted(schema.channelsTable.id, bot.accessContext.channelIds),
		// 				isNull(schema.channelsTable.deletedAt),
		// 			),
		// 		),
		// 	),
		// ),
		// Match.when("attachments", () =>
		// 	Effect.succeed(
		// 		buildWhereClause(
		// 			schema.attachmentsTable,
		// 			and(
		// 				inArraySorted(schema.attachmentsTable.channelId, bot.accessContext.channelIds),
		// 				isNull(schema.attachmentsTable.deletedAt),
		// 			),
		// 		),
		// 	),
		// ),

		Match.orElse((table) =>
			Effect.fail(
				new BotTableAccessError({
					message: "Table not handled in bot where clause system",
					detail: `Missing where clause implementation for table: ${table}`,
					table,
				}),
			),
		),
	)
}
