import { and, eq, isNull, or, schema } from "@hazel/db"
import { Effect, Match, Schema } from "effect"
import type { AuthenticatedUserWithContext } from "../auth/user-auth"
import { buildWhereClause, inArraySorted, type WhereClauseResult } from "./where-clause-builder"

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
 * Uses Drizzle's QueryBuilder for type-safe WHERE clause generation with
 * parameterized queries.
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
			// Users can always see themselves and other users who are members of their organizations
			Effect.succeed(
				buildWhereClause(
					schema.usersTable,
					and(
						user.accessContext.coOrgUserIds.length > 0
							? or(
									eq(schema.usersTable.id, user.internalUserId),
									inArraySorted(schema.usersTable.id, user.accessContext.coOrgUserIds),
								)
							: eq(schema.usersTable.id, user.internalUserId),
						isNull(schema.usersTable.deletedAt),
					),
				),
			),
		),

		Match.when("user_presence_status", () =>
			// Users can always see their own presence and presence of users in the same organizations
			Effect.succeed(
				buildWhereClause(
					schema.userPresenceStatusTable,
					user.accessContext.coOrgUserIds.length > 0
						? or(
								eq(schema.userPresenceStatusTable.userId, user.internalUserId),
								inArraySorted(schema.userPresenceStatusTable.userId, user.accessContext.coOrgUserIds),
							)
						: eq(schema.userPresenceStatusTable.userId, user.internalUserId),
				),
			),
		),

		// ===========================================
		// Organization tables
		// ===========================================

		Match.when("organizations", () =>
			// Show only organizations where the user is a member
			Effect.succeed(
				buildWhereClause(
					schema.organizationsTable,
					and(
						inArraySorted(schema.organizationsTable.id, user.accessContext.organizationIds),
						isNull(schema.organizationsTable.deletedAt),
					),
				),
			),
		),

		Match.when("organization_members", () =>
			// Show members from organizations where the user is a member
			Effect.succeed(
				buildWhereClause(
					schema.organizationMembersTable,
					and(
						inArraySorted(
							schema.organizationMembersTable.organizationId,
							user.accessContext.organizationIds,
						),
						isNull(schema.organizationMembersTable.deletedAt),
					),
				),
			),
		),

		// ===========================================
		// Channel tables
		// ===========================================

		Match.when("channels", () =>
			// Users can only see channels they're members of
			Effect.succeed(
				buildWhereClause(
					schema.channelsTable,
					and(
						inArraySorted(schema.channelsTable.id, user.accessContext.channelIds),
						isNull(schema.channelsTable.deletedAt),
					),
				),
			),
		),

		Match.when("channel_members", () =>
			// See all members of channels the user belongs to
			Effect.succeed(
				buildWhereClause(
					schema.channelMembersTable,
					and(
						inArraySorted(schema.channelMembersTable.channelId, user.accessContext.channelIds),
						isNull(schema.channelMembersTable.deletedAt),
					),
				),
			),
		),

		// ===========================================
		// Message tables
		// ===========================================

		Match.when("messages", () =>
			// Messages only from channels the user is a member of
			Effect.succeed(
				buildWhereClause(
					schema.messagesTable,
					and(
						inArraySorted(schema.messagesTable.channelId, user.accessContext.channelIds),
						isNull(schema.messagesTable.deletedAt),
					),
				),
			),
		),

		Match.when("message_reactions", () => {
			// Reactions on messages from accessible channels
			// Uses a subquery since reactions don't have channelId directly
			const channelIds = [...user.accessContext.channelIds].sort()

			if (channelIds.length === 0) {
				return Effect.succeed({
					whereClause: "false",
					params: [],
				} satisfies WhereClauseResult)
			}

			// Build parameterized subquery
			const placeholders = channelIds.map((_, i) => `$${i + 1}`).join(", ")

			return Effect.succeed({
				whereClause: `"messageId" IN (SELECT "id" FROM "messages" WHERE "channelId" IN (${placeholders}) AND "deletedAt" IS NULL)`,
				params: channelIds,
			} satisfies WhereClauseResult)
		}),

		Match.when("attachments", () =>
			// Attachments from accessible channels only
			Effect.succeed(
				buildWhereClause(
					schema.attachmentsTable,
					and(
						inArraySorted(schema.attachmentsTable.channelId, user.accessContext.channelIds),
						isNull(schema.attachmentsTable.deletedAt),
					),
				),
			),
		),

		// ===========================================
		// Notification tables
		// ===========================================

		Match.when("notifications", () =>
			// Users can only see their own notifications (via their member IDs)
			Effect.succeed(
				buildWhereClause(
					schema.notificationsTable,
					inArraySorted(schema.notificationsTable.memberId, user.accessContext.memberIds),
				),
			),
		),

		Match.when("pinned_messages", () =>
			// Pinned messages from accessible channels
			Effect.succeed(
				buildWhereClause(
					schema.pinnedMessagesTable,
					inArraySorted(schema.pinnedMessagesTable.channelId, user.accessContext.channelIds),
				),
			),
		),

		// ===========================================
		// Interaction tables
		// ===========================================

		Match.when("typing_indicators", () =>
			// Typing indicators from accessible channels
			Effect.succeed(
				buildWhereClause(
					schema.typingIndicatorsTable,
					inArraySorted(schema.typingIndicatorsTable.channelId, user.accessContext.channelIds),
				),
			),
		),

		Match.when("invitations", () =>
			// Invitations for organizations the user belongs to
			Effect.succeed(
				buildWhereClause(
					schema.invitationsTable,
					inArraySorted(schema.invitationsTable.organizationId, user.accessContext.organizationIds),
				),
			),
		),

		// ===========================================
		// Bot tables
		// ===========================================

		Match.when("bots", () =>
			// Public bots, bots created by user, or bots belonging to users in the same orgs
			Effect.succeed(
				buildWhereClause(
					schema.botsTable,
					and(
						user.accessContext.coOrgUserIds.length > 0
							? or(
									eq(schema.botsTable.isPublic, true),
									eq(schema.botsTable.createdBy, user.internalUserId),
									inArraySorted(schema.botsTable.userId, user.accessContext.coOrgUserIds),
								)
							: or(
									eq(schema.botsTable.isPublic, true),
									eq(schema.botsTable.createdBy, user.internalUserId),
								),
						isNull(schema.botsTable.deletedAt),
					),
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
