import { schema } from "@hazel/db"
import { Effect, Match, Schema } from "effect"
import type { AuthenticatedUserWithContext } from "../auth/user-auth"
import { buildInClause, buildInClauseWithDeletedAt, type WhereClauseResult } from "./where-clause-builder"

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
 * This ensures users can only access data they have permission to see.
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

		Match.when("users", () => {
			// Users can always see themselves and other users who are members of their organizations
			const coOrgIds = [...user.accessContext.coOrgUserIds].sort()
			const { id, deletedAt } = schema.usersTable

			if (coOrgIds.length === 0) {
				return Effect.succeed({
					whereClause: `"${id.name}" = $1 AND "${deletedAt.name}" IS NULL`,
					params: [user.internalUserId],
				} satisfies WhereClauseResult)
			}

			const placeholders = coOrgIds.map((_, i) => `$${i + 2}`).join(", ")
			return Effect.succeed({
				whereClause: `("${id.name}" = $1 OR "${id.name}" IN (${placeholders})) AND "${deletedAt.name}" IS NULL`,
				params: [user.internalUserId, ...coOrgIds],
			} satisfies WhereClauseResult)
		}),

		Match.when("user_presence_status", () => {
			// Users can always see their own presence and presence of users in the same organizations
			const coOrgIds = [...user.accessContext.coOrgUserIds].sort()
			const { userId } = schema.userPresenceStatusTable

			if (coOrgIds.length === 0) {
				return Effect.succeed({
					whereClause: `"${userId.name}" = $1`,
					params: [user.internalUserId],
				} satisfies WhereClauseResult)
			}

			const placeholders = coOrgIds.map((_, i) => `$${i + 2}`).join(", ")
			return Effect.succeed({
				whereClause: `"${userId.name}" = $1 OR "${userId.name}" IN (${placeholders})`,
				params: [user.internalUserId, ...coOrgIds],
			} satisfies WhereClauseResult)
		}),

		// ===========================================
		// Organization tables
		// ===========================================

		Match.when("organizations", () =>
			// Show only organizations where the user is a member
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.organizationsTable.id,
					user.accessContext.organizationIds,
					schema.organizationsTable.deletedAt,
				),
			),
		),

		Match.when("organization_members", () =>
			// Show members from organizations where the user is a member
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.organizationMembersTable.organizationId,
					user.accessContext.organizationIds,
					schema.organizationMembersTable.deletedAt,
				),
			),
		),

		// ===========================================
		// Channel tables
		// ===========================================

		Match.when("channels", () =>
			// Users can only see channels they're members of
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.channelsTable.id,
					user.accessContext.channelIds,
					schema.channelsTable.deletedAt,
				),
			),
		),

		Match.when("channel_members", () =>
			// See all members of channels the user belongs to
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.channelMembersTable.channelId,
					user.accessContext.channelIds,
					schema.channelMembersTable.deletedAt,
				),
			),
		),

		// ===========================================
		// Message tables
		// ===========================================

		Match.when("messages", () =>
			// Messages only from channels the user is a member of
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.messagesTable.channelId,
					user.accessContext.channelIds,
					schema.messagesTable.deletedAt,
				),
			),
		),

		Match.when("message_reactions", () =>
			// Reactions from accessible channels (channelId is denormalized on the table)
			Effect.succeed(
				buildInClause(schema.messageReactionsTable.channelId, user.accessContext.channelIds),
			),
		),

		Match.when("attachments", () =>
			// Attachments from accessible channels only
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.attachmentsTable.channelId,
					user.accessContext.channelIds,
					schema.attachmentsTable.deletedAt,
				),
			),
		),

		// ===========================================
		// Notification tables
		// ===========================================

		Match.when("notifications", () =>
			// Users can only see their own notifications (via their member IDs)
			Effect.succeed(buildInClause(schema.notificationsTable.memberId, user.accessContext.memberIds)),
		),

		Match.when("pinned_messages", () =>
			// Pinned messages from accessible channels
			Effect.succeed(
				buildInClause(schema.pinnedMessagesTable.channelId, user.accessContext.channelIds),
			),
		),

		// ===========================================
		// Interaction tables
		// ===========================================

		Match.when("typing_indicators", () =>
			// Typing indicators from accessible channels
			Effect.succeed(
				buildInClause(schema.typingIndicatorsTable.channelId, user.accessContext.channelIds),
			),
		),

		Match.when("invitations", () =>
			// Invitations for organizations the user belongs to
			Effect.succeed(
				buildInClause(schema.invitationsTable.organizationId, user.accessContext.organizationIds),
			),
		),

		// ===========================================
		// Bot tables
		// ===========================================

		Match.when("bots", () => {
			// Public bots, bots created by user, or bots belonging to users in the same orgs
			const coOrgIds = [...user.accessContext.coOrgUserIds].sort()
			const { isPublic, createdBy, userId, deletedAt } = schema.botsTable

			if (coOrgIds.length === 0) {
				return Effect.succeed({
					whereClause: `("${isPublic.name}" = $1 OR "${createdBy.name}" = $2) AND "${deletedAt.name}" IS NULL`,
					params: [true, user.internalUserId],
				} satisfies WhereClauseResult)
			}

			const placeholders = coOrgIds.map((_, i) => `$${i + 3}`).join(", ")
			return Effect.succeed({
				whereClause: `("${isPublic.name}" = $1 OR "${createdBy.name}" = $2 OR "${userId.name}" IN (${placeholders})) AND "${deletedAt.name}" IS NULL`,
				params: [true, user.internalUserId, ...coOrgIds],
			} satisfies WhereClauseResult)
		}),

		// ===========================================
		// Integration tables
		// ===========================================

		Match.when("integration_connections", () =>
			// Integration connections for organizations the user belongs to
			Effect.succeed(
				buildInClauseWithDeletedAt(
					schema.integrationConnectionsTable.organizationId,
					user.accessContext.organizationIds,
					schema.integrationConnectionsTable.deletedAt,
				),
			),
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
