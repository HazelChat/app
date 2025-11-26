import { Effect, Match, Schema } from "effect"
import type { AuthenticatedBot } from "../auth/bot-auth"

/**
 * Convert an array of IDs to a SQL IN clause string
 * @param ids - Array of ID strings
 * @returns SQL IN clause string like "('id1','id2','id3')"
 */
function toSqlInClause(ids: readonly string[]): string {
	if (ids.length === 0) return "(NULL)"
	return `('${ids.join("','")}')`
}

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
 * @param table - The table name
 * @param bot - The authenticated bot context
 * @returns Effect that succeeds with SQL WHERE clause string or fails with BotTableAccessError
 */
export function getBotWhereClauseForTable(
	table: BotAllowedTable,
	bot: AuthenticatedBot,
): Effect.Effect<string, BotTableAccessError> {
	return Match.value(table).pipe(
		Match.when("messages", () =>
			// Messages only from channels the bot is a member of
			Effect.succeed(
				`"channelId" IN ${toSqlInClause(bot.accessContext.channelIds)} AND "deletedAt" IS NULL`,
			),
		),
		// Future tables can be added here:
		// Match.when("channels", () =>
		// 	Effect.succeed(`"id" IN ${toSqlInClause(bot.accessContext.channelIds)} AND "deletedAt" IS NULL`),
		// ),
		// Match.when("attachments", () =>
		// 	Effect.succeed(`"channelId" IN ${toSqlInClause(bot.accessContext.channelIds)} AND "deletedAt" IS NULL`),
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
