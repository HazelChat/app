import type { BotId, UserId } from "@hazel/effect-lib"
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const botsTable = pgTable(
	"bots",
	{
		id: uuid().primaryKey().defaultRandom().$type<BotId>(),
		userId: uuid().notNull().unique().$type<UserId>(),
		createdBy: uuid().notNull().$type<UserId>(),
		name: varchar({ length: 100 }).notNull(),
		description: text(),
		webhookUrl: text(),
		apiTokenHash: text().notNull(),
		scopes: jsonb().$type<string[]>(),
		metadata: jsonb().$type<Record<string, any>>(),
		isPublic: boolean().notNull().default(false),
		installCount: integer().notNull().default(0),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("bots_user_id_idx").on(table.userId),
		index("bots_created_by_idx").on(table.createdBy),
		index("bots_is_public_idx").on(table.isPublic),
		index("bots_deleted_at_idx").on(table.deletedAt),
	],
)

// Type exports
export type Bot = typeof botsTable.$inferSelect
export type NewBot = typeof botsTable.$inferInsert
