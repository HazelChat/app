import type { ChannelId, ChannelWebhookId, OrganizationId, UserId } from "@hazel/schema"
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const channelWebhooksTable = pgTable(
	"channel_webhooks",
	{
		id: uuid().primaryKey().defaultRandom().$type<ChannelWebhookId>(),
		channelId: uuid().notNull().$type<ChannelId>(),
		organizationId: uuid().notNull().$type<OrganizationId>(),
		// Bot identity for this webhook (machine user)
		botUserId: uuid().notNull().$type<UserId>(),
		// Webhook configuration
		name: varchar({ length: 100 }).notNull(),
		description: text(),
		avatarUrl: text(),
		// Token for authentication (SHA-256 hashed)
		tokenHash: text().notNull(),
		// Last 4 chars of token for display
		tokenSuffix: varchar({ length: 4 }).notNull(),
		// Whether the webhook is active
		isEnabled: boolean().notNull().default(true),
		// Audit fields
		createdBy: uuid().notNull().$type<UserId>(),
		lastUsedAt: timestamp({ mode: "date", withTimezone: true }),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("channel_webhooks_channel_id_idx").on(table.channelId),
		index("channel_webhooks_organization_id_idx").on(table.organizationId),
		index("channel_webhooks_bot_user_id_idx").on(table.botUserId),
		index("channel_webhooks_token_hash_idx").on(table.tokenHash),
		index("channel_webhooks_deleted_at_idx").on(table.deletedAt),
	],
)

// Type exports
export type ChannelWebhook = typeof channelWebhooksTable.$inferSelect
export type NewChannelWebhook = typeof channelWebhooksTable.$inferInsert
