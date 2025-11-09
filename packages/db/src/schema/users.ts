import type { UserId } from "@hazel/effect-lib"
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const userStatusEnum = pgEnum("user_status", ["online", "offline", "away"])

export const userTypeEnum = pgEnum("user_type", ["user", "machine"])

export const usersTable = pgTable(
	"users",
	{
		id: uuid().primaryKey().defaultRandom().$type<UserId>(),
		externalId: varchar({ length: 255 }).notNull().unique(),
		email: varchar({ length: 255 }).notNull(),
		firstName: varchar({ length: 100 }).notNull(),
		lastName: varchar({ length: 100 }).notNull(),
		avatarUrl: text().notNull(),
		userType: userTypeEnum().notNull().default("user"),
		status: userStatusEnum().notNull().default("offline"),
		lastSeen: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		settings: jsonb().$type<Record<string, any>>(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("users_external_id_idx").on(table.externalId),
		index("users_email_idx").on(table.email),
		index("users_user_type_idx").on(table.userType),
		index("users_deleted_at_idx").on(table.deletedAt),
	],
)

// Type exports
export type User = typeof usersTable.$inferSelect
export type NewUser = typeof usersTable.$inferInsert
