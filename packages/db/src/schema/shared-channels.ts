import type { ChannelId, OrganizationId, UserId } from "@hazel/schema"
import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

/**
 * channel_organization_shares
 *
 * Tracks which organizations have access to shared channels.
 * The channel's organizationId field indicates the owner/initiator org.
 * Records in this table represent "guest" organizations that have been granted access.
 */
export const channelOrganizationSharesTable = pgTable("channel_organization_shares", {
	id: uuid().primaryKey().defaultRandom(),

	// The shared channel
	channelId: uuid().notNull().$type<ChannelId>(),

	// The organization that has been granted access (guest org)
	organizationId: uuid().notNull().$type<OrganizationId>(),

	// When this share was created
	sharedAt: timestamp({ mode: "date" }).notNull().defaultNow(),

	// User from the initiator org who created this share
	sharedBy: uuid().notNull().$type<UserId>(),

	// When this share was revoked (null = still active)
	revokedAt: timestamp({ mode: "date" }),

	// User who revoked the share
	revokedBy: uuid().$type<UserId>(),
},
(table) => [
	// Unique constraint: one share per channel-org pair
	uniqueIndex("channel_org_share_unique").on(table.channelId, table.organizationId),
	// Index for querying shares by channel
	index("channel_org_shares_channel_id_idx").on(table.channelId),
	// Index for querying shares by organization
	index("channel_org_shares_org_id_idx").on(table.organizationId),
	// Index for finding active shares
	index("channel_org_shares_revoked_at_idx").on(table.revokedAt),
])

/**
 * shared_channel_participants
 *
 * Tracks users from guest organizations who have actively participated in a shared channel.
 * A user is considered a "participant" once they join the channel or post a message.
 * This enables the "show only active participants" visibility model.
 */
export const sharedChannelParticipantsTable = pgTable("shared_channel_participants", {
	id: uuid().primaryKey().defaultRandom(),

	// The shared channel
	channelId: uuid().notNull().$type<ChannelId>(),

	// The participating user
	userId: uuid().notNull().$type<UserId>(),

	// Which organization this user is from (for context)
	organizationId: uuid().notNull().$type<OrganizationId>(),

	// When this user first became visible in the channel
	firstSeenAt: timestamp({ mode: "date" }).notNull().defaultNow(),

	// Last time this user was active (posted message, reacted, etc.)
	lastActiveAt: timestamp({ mode: "date" }).notNull().defaultNow(),
},
(table) => [
	// Unique constraint: one participant record per channel-user-org combination
	uniqueIndex("channel_participant_unique").on(table.channelId, table.userId, table.organizationId),
	// Index for querying participants by channel
	index("shared_participants_channel_id_idx").on(table.channelId),
	// Index for querying participants by user
	index("shared_participants_user_id_idx").on(table.userId),
])
