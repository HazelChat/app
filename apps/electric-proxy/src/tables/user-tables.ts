import { schema } from "@hazel/db"
import { Effect, Match, Schema } from "effect"
import type { AuthenticatedUserWithContext } from "../auth/user-auth"
import {
	buildDeletedAtNullClause,
	buildInClause,
	buildNoFilterClause,
	type WhereClauseResult,
} from "./where-clause-builder"

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

	// Integration tables
	"integration_connections",
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
 *
 * NOTE: Array-based IN filters (channelIds, organizationIds, etc.) were removed
 * because the cached access context caused slow updates when users were added
 * to new channels/organizations. Electric now streams all non-deleted data,
 * and access control is handled at the application layer.
 *
 * Uses unqualified column names (via column.name) for Electric SQL compatibility.
 * All WHERE clauses are parameterized for security.
 *
 * @param table - The table name
 * @param user - The authenticated user context
 * @returns Effect that succeeds with WhereClauseResult or fails with TableAccessError
 */
export function getWhereClauseForTable(
	table: AllowedTable,
	user: AuthenticatedUserWithContext,
): Effect.Effect<WhereClauseResult, TableAccessError> {
	return Match.value(table).pipe(
		// ===========================================
		// User tables
		// ===========================================

		Match.when("users", () =>
			// All non-deleted users visible
			Effect.succeed(buildDeletedAtNullClause(schema.usersTable.deletedAt)),
		),

		Match.when("user_presence_status", () =>
			// All presence status visible
			Effect.succeed(buildNoFilterClause()),
		),

		// ===========================================
		// Organization tables
		// ===========================================

		Match.when("organizations", () =>
			// All non-deleted organizations visible
			Effect.succeed(buildDeletedAtNullClause(schema.organizationsTable.deletedAt)),
		),

		Match.when("organization_members", () =>
			// All non-deleted organization members visible
			Effect.succeed(buildDeletedAtNullClause(schema.organizationMembersTable.deletedAt)),
		),

		// ===========================================
		// Channel tables
		// ===========================================

		Match.when("channels", () => {
			const { id, deletedAt } = schema.channelsTable
			// Filter channels to only those the user is a member of (uses Electric subquery feature)
			return Effect.succeed({
				whereClause: `"${id.name}" IN (SELECT "channelId" FROM "channel_members" WHERE "userId" = $1 AND "deletedAt" IS NULL) AND "${deletedAt.name}" IS NULL`,
				params: [user.internalUserId],
			} satisfies WhereClauseResult)
		}),

		Match.when("channel_members", () =>
			// All non-deleted channel members visible
			Effect.succeed(buildDeletedAtNullClause(schema.channelMembersTable.deletedAt)),
		),

		// ===========================================
		// Message tables
		// ===========================================

		Match.when("messages", () =>
			// All non-deleted messages visible
			Effect.succeed(buildDeletedAtNullClause(schema.messagesTable.deletedAt)),
		),

		Match.when("message_reactions", () =>
			// All message reactions visible
			Effect.succeed(buildNoFilterClause()),
		),

		Match.when("attachments", () =>
			// All non-deleted attachments visible
			Effect.succeed(buildDeletedAtNullClause(schema.attachmentsTable.deletedAt)),
		),

		// ===========================================
		// Notification tables
		// ===========================================

		Match.when("notifications", () =>
			// Users can only see their own notifications (via their member IDs)
			// This filter is kept as notifications are user-specific and memberIds rarely change mid-session
			Effect.succeed(buildInClause(schema.notificationsTable.memberId, user.accessContext.memberIds)),
		),

		Match.when("pinned_messages", () =>
			// All pinned messages visible
			Effect.succeed(buildNoFilterClause()),
		),

		// ===========================================
		// Interaction tables
		// ===========================================

		Match.when("typing_indicators", () =>
			// All typing indicators visible
			Effect.succeed(buildNoFilterClause()),
		),

		Match.when("invitations", () =>
			// All invitations visible
			Effect.succeed(buildNoFilterClause()),
		),

		// ===========================================
		// Bot tables
		// ===========================================

		Match.when("bots", () => {
			// Public bots or bots created by user
			const { isPublic, createdBy, deletedAt } = schema.botsTable
			return Effect.succeed({
				whereClause: `("${isPublic.name}" = $1 OR "${createdBy.name}" = $2) AND "${deletedAt.name}" IS NULL`,
				params: [true, user.internalUserId],
			} satisfies WhereClauseResult)
		}),

		// ===========================================
		// Integration tables
		// ===========================================

		Match.when("integration_connections", () =>
			// All non-deleted integration connections visible
			Effect.succeed(buildDeletedAtNullClause(schema.integrationConnectionsTable.deletedAt)),
		),

		// ===========================================
		// Fallback for unhandled tables
		// ===========================================

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
