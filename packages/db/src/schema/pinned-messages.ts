import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import type { ChannelId, MessageId, PinnedMessageId, UserId } from "../lib/schema"

// Pinned messages table (normalized from array in Convex)
export const pinnedMessagesTable = pgTable(
	"pinned_messages",
	{
		id: uuid().primaryKey().defaultRandom().$type<PinnedMessageId>(),
		channelId: uuid().notNull().$type<ChannelId>(),
		messageId: uuid().notNull().$type<MessageId>(),
		pinnedBy: uuid().notNull().$type<UserId>(),
		pinnedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("pinned_messages_channel_id_idx").on(table.channelId),
		index("pinned_messages_message_id_idx").on(table.messageId),
		// A message can only be pinned once per channel
		uniqueIndex("pinned_messages_unique_idx").on(table.channelId, table.messageId),
	],
)

// Type exports
export type PinnedMessage = typeof pinnedMessagesTable.$inferSelect
export type NewPinnedMessage = typeof pinnedMessagesTable.$inferInsert
