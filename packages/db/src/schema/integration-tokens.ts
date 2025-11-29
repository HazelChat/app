import type { IntegrationConnectionId, IntegrationTokenId } from "@hazel/schema"
import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const integrationTokensTable = pgTable(
	"integration_tokens",
	{
		id: uuid().primaryKey().defaultRandom().$type<IntegrationTokenId>(),
		connectionId: uuid().notNull().unique().$type<IntegrationConnectionId>(),

		// Encrypted token data (AES-256-GCM)
		encryptedAccessToken: text().notNull(),
		encryptedRefreshToken: text(),
		iv: varchar({ length: 32 }).notNull(), // Base64 encoded initialization vector
		encryptionKeyVersion: integer().notNull().default(1),

		// Token metadata (not encrypted, needed for refresh logic)
		tokenType: varchar({ length: 50 }).default("Bearer"),
		scope: text(), // Granted OAuth scopes
		expiresAt: timestamp({ mode: "date", withTimezone: true }),
		refreshTokenExpiresAt: timestamp({ mode: "date", withTimezone: true }),

		// Audit fields
		lastRefreshedAt: timestamp({ mode: "date", withTimezone: true }),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("int_tokens_connection_id_idx").on(table.connectionId),
		index("int_tokens_expires_at_idx").on(table.expiresAt),
		index("int_tokens_key_version_idx").on(table.encryptionKeyVersion),
	],
)

// Type exports
export type IntegrationToken = typeof integrationTokensTable.$inferSelect
export type NewIntegrationToken = typeof integrationTokensTable.$inferInsert
