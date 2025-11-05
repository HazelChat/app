import type {
	ChannelId,
	ChannelMemberId,
	MessageId,
	OrganizationId,
	UserId,
} from "@hazel/effect-lib"
import { sql } from "drizzle-orm"
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"

// Channel types
export const channelTypeEnum = pgEnum("channel_type", ["public", "private", "thread", "direct", "single"])

// Channels table
export const channelsTable = pgTable(
	"channels",
	{
		id: uuid().primaryKey().defaultRandom().$type<ChannelId>(),
		name: varchar({ length: 255 }).notNull(),
		type: channelTypeEnum().notNull(),
		organizationId: uuid().notNull().$type<OrganizationId>(),

		parentChannelId: uuid().$type<ChannelId>(),

		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("channels_organization_id_idx").on(table.organizationId),
		index("channels_parent_channel_id_idx").on(table.parentChannelId),
		index("channels_type_idx").on(table.type),
		index("channels_deleted_at_idx").on(table.deletedAt),
	],
)

// Channel members table - tracks user membership in channels
export const channelMembersTable = pgTable(
	"channel_members",
	{
		id: uuid().primaryKey().defaultRandom().$type<ChannelMemberId>(),
		channelId: uuid().notNull().$type<ChannelId>(),
		userId: uuid().notNull().$type<UserId>(),
		isHidden: boolean().notNull().default(false),
		isMuted: boolean().notNull().default(false),
		isFavorite: boolean().notNull().default(false),
		lastSeenMessageId: uuid().$type<MessageId>(),
		notificationCount: integer().notNull().default(0),
		joinedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("channel_members_channel_id_idx").on(table.channelId),
		index("channel_members_user_id_idx").on(table.userId),
		index("channel_members_channel_user_idx").on(table.channelId, table.userId),
	],
)

// Type exports
export type Channel = typeof channelsTable.$inferSelect
export type NewChannel = typeof channelsTable.$inferInsert
export type ChannelMember = typeof channelMembersTable.$inferSelect
export type NewChannelMember = typeof channelMembersTable.$inferInsert
