import { Effect, Match, Schema } from "effect"
import type { AuthenticatedUserWithContext } from "./auth"

/**
 * Convert an array of IDs to a SQL IN clause string
 * @param ids - Array of ID strings
 * @returns SQL IN clause string like "('id1','id2','id3')"
 */
function toSqlInClause(ids: readonly string[]): string {
	if (ids.length === 0) return "('')"
	return `('${ids.join("','")}')`
}

/**
 * Error thrown when table access is denied or where clause cannot be generated
 */
export class TableAccessError extends Schema.TaggedError<TableAccessError>()("TableAccessError", {
	message: Schema.String,
	detail: Schema.optional(Schema.String),
	table: Schema.String,
}) {}

/**
 * Whitelisted tables that can be accessed through the Electric proxy.
 * Only these tables are allowed for authenticated users.
 */
export const ALLOWED_TABLES = [
	// User tables
	"users",
	"user_presence_status",

	// Organization tables
	"organizations",
	"organization_members",

	// Channel tables
	"channels",
	"channel_members",

	// Message tables
	"messages",
	"message_reactions",
	"attachments",

	// Notification tables
	"notifications",
	"pinned_messages",

	// Interaction tables
	"typing_indicators",
	"invitations",

	// Bot tables
	"bots",
] as const

export type AllowedTable = (typeof ALLOWED_TABLES)[number]

/**
 * Check if a table name is allowed
 */
export function isTableAllowed(table: string): table is AllowedTable {
	return ALLOWED_TABLES.includes(table as AllowedTable)
}

/**
 * Validate that a table parameter is present and allowed
 */
export function validateTable(table: string | null): {
	valid: boolean
	table?: AllowedTable
	error?: string
} {
	if (!table) {
		return {
			valid: false,
			error: "Missing required parameter: table",
		}
	}

	if (!isTableAllowed(table)) {
		return {
			valid: false,
			error: `Table '${table}' is not allowed. Only whitelisted tables can be accessed.`,
		}
	}

	return {
		valid: true,
		table: table as AllowedTable,
	}
}

/**
 * Get the WHERE clause for a table based on the authenticated user.
 * This ensures users can only access data they have permission to see.
 *
 * @param table - The table name
 * @param user - The authenticated user context
 * @returns Effect that succeeds with SQL WHERE clause string or fails with TableAccessError
 */
export function getWhereClauseForTable(
	table: AllowedTable,
	user: AuthenticatedUserWithContext,
): Effect.Effect<string, TableAccessError> {
	return Match.value(table).pipe(
		// User tables
		Match.when("users", () =>
			// Users can see other users who are members of their organizations
			Effect.succeed(
				`"id" IN ${toSqlInClause(user.accessContext.coOrgUserIds)} AND "deletedAt" IS NULL`,
			),
		),
		Match.when("user_presence_status", () =>
			// See presence status of users in the same organizations
			Effect.succeed(`"userId" IN ${toSqlInClause(user.accessContext.coOrgUserIds)}`),
		),
		// Organization tables
		Match.when("organizations", () =>
			// Show only organizations where the user is a member
			Effect.succeed(
				`"id" IN ${toSqlInClause(user.accessContext.organizationIds)} AND "deletedAt" IS NULL`,
			),
		),
		Match.when("organization_members", () =>
			// Show members from organizations where the user is a member
			Effect.succeed(
				`"organizationId" IN ${toSqlInClause(user.accessContext.organizationIds)} AND "deletedAt" IS NULL`,
			),
		),
		// Channel tables
		Match.when("channels", () =>
			// Users can only see channels they're members of
			Effect.succeed(`"id" IN ${toSqlInClause(user.accessContext.channelIds)} AND "deletedAt" IS NULL`),
		),
		Match.when("channel_members", () =>
			// See all members of channels the user belongs to
			Effect.succeed(
				`"channelId" IN ${toSqlInClause(user.accessContext.channelIds)} AND "deletedAt" IS NULL`,
			),
		),
		// Message tables
		Match.when("messages", () =>
			// Messages only from channels the user is a member of
			Effect.succeed(
				`"channelId" IN ${toSqlInClause(user.accessContext.channelIds)} AND "deletedAt" IS NULL`,
			),
		),
		Match.when("message_reactions", () =>
			// Reactions on messages from accessible channels (relies on messages table filtering)
			Effect.succeed(
				`"messageId" IN (SELECT "id" FROM "messages" WHERE "channelId" IN ${toSqlInClause(user.accessContext.channelIds)} AND "deletedAt" IS NULL)`,
			),
		),
		Match.when("attachments", () =>
			// Attachments from accessible channels only
			Effect.succeed(
				`"channelId" IN ${toSqlInClause(user.accessContext.channelIds)} AND "deletedAt" IS NULL`,
			),
		),
		// Notification tables
		Match.when("notifications", () =>
			// Users can only see their own notifications
			Effect.succeed(`"memberId" IN ${toSqlInClause(user.accessContext.memberIds)}`),
		),
		Match.when("pinned_messages", () =>
			// Pinned messages from accessible channels
			Effect.succeed(`"channelId" IN ${toSqlInClause(user.accessContext.channelIds)}`),
		),
		// Interaction tables
		Match.when("typing_indicators", () =>
			// Typing indicators from accessible channels
			Effect.succeed(`"channelId" IN ${toSqlInClause(user.accessContext.channelIds)}`),
		),
		Match.when("invitations", () =>
			// Invitations for organizations the user belongs to
			Effect.succeed(`"organizationId" IN ${toSqlInClause(user.accessContext.organizationIds)}`),
		),
		// Bot tables
		Match.when("bots", () =>
			// Public bots, bots created by user, or bots belonging to users in the same orgs
			Effect.succeed(
				`("isPublic" = true OR "createdBy" = '${user.internalUserId}' OR "userId" IN ${toSqlInClause(user.accessContext.coOrgUserIds)}) AND "deletedAt" IS NULL`,
			),
		),
		Match.orElse((table) =>
			Effect.fail(
				new TableAccessError({
					message: "Table not handled in where clause system",
					detail: `Missing where clause implementation for table: ${table}`,
					table,
				}),
			),
		),
	)
}
