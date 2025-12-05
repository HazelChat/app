import type { ChannelId, MessageId, MessageReactionId, UserId } from "@hazel/schema"
import { index, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core"

// Embed types for JSONB column
export interface MessageEmbedAuthor {
	name: string
	url?: string
	iconUrl?: string
}

export interface MessageEmbedFooter {
	text: string
	iconUrl?: string
}

export interface MessageEmbedField {
	name: string
	value: string
	inline?: boolean
}

export interface MessageEmbed {
	title?: string
	description?: string
	url?: string
	color?: number // Hex color as integer
	author?: MessageEmbedAuthor
	footer?: MessageEmbedFooter
	image?: { url: string }
	thumbnail?: { url: string }
	fields?: MessageEmbedField[]
	timestamp?: string // ISO 8601 timestamp
}

// Messages table
export const messagesTable = pgTable(
	"messages",
	{
		id: uuid().primaryKey().defaultRandom().$type<MessageId>(),
		channelId: uuid().notNull().$type<ChannelId>(),
		authorId: uuid().notNull().$type<UserId>(),
		content: text().notNull(),
		// Rich embeds for webhook messages (Discord-style)
		embeds: jsonb().$type<MessageEmbed[]>(),
		// Reply to another message
		replyToMessageId: uuid().$type<MessageId>(),
		// Thread channel (if this message started a thread)
		threadChannelId: uuid().$type<ChannelId>(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("messages_channel_id_idx").on(table.channelId),
		index("messages_author_id_idx").on(table.authorId),
		index("messages_reply_to_idx").on(table.replyToMessageId),
		index("messages_thread_channel_idx").on(table.threadChannelId),
		index("messages_created_at_idx").on(table.createdAt),
		index("messages_deleted_at_idx").on(table.deletedAt),
	],
)

// Message reactions table (normalized from array in Convex)
export const messageReactionsTable = pgTable(
	"message_reactions",
	{
		id: uuid().primaryKey().defaultRandom().$type<MessageReactionId>(),
		messageId: uuid().notNull().$type<MessageId>(),
		channelId: uuid().notNull().$type<ChannelId>(),
		userId: uuid().notNull().$type<UserId>(),
		emoji: varchar({ length: 50 }).notNull(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("reactions_channel_id_idx").on(table.channelId),
		index("reactions_message_id_idx").on(table.messageId),
		index("reactions_user_id_idx").on(table.userId),
		index("reactions_message_user_emoji_idx").on(table.messageId, table.userId, table.emoji),
		unique("reactions_message_user_emoji_unique").on(table.messageId, table.userId, table.emoji),
	],
)

// Message attachments junction table removed - attachments now directly reference messageId

// Type exports
export type Message = typeof messagesTable.$inferSelect
export type NewMessage = typeof messagesTable.$inferInsert
export type MessageReaction = typeof messageReactionsTable.$inferSelect
export type NewMessageReaction = typeof messageReactionsTable.$inferInsert
