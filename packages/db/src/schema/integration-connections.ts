import type { IntegrationConnectionId, OrganizationId, UserId } from "@hazel/schema"
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"

export const integrationProviderEnum = pgEnum("integration_provider", ["linear", "github", "figma", "notion"])

export const connectionLevelEnum = pgEnum("connection_level", ["organization", "user"])

export const connectionStatusEnum = pgEnum("connection_status", ["active", "expired", "revoked", "error"])

export const integrationConnectionsTable = pgTable(
	"integration_connections",
	{
		id: uuid().primaryKey().defaultRandom().$type<IntegrationConnectionId>(),
		provider: integrationProviderEnum().notNull(),
		organizationId: uuid().notNull().$type<OrganizationId>(),
		userId: uuid().$type<UserId>(), // null for org-level, populated for user-level
		level: connectionLevelEnum().notNull(),
		status: connectionStatusEnum().notNull().default("active"),

		// External account info
		externalAccountId: varchar({ length: 255 }),
		externalAccountName: varchar({ length: 255 }),

		// Who connected it
		connectedBy: uuid().notNull().$type<UserId>(),

		// Integration-specific settings (e.g., defaultTeamId for Linear)
		settings: jsonb().$type<Record<string, any>>(),

		// Error details when status is 'error'
		errorMessage: text(),

		lastUsedAt: timestamp({ mode: "date", withTimezone: true }),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("int_conn_org_idx").on(table.organizationId),
		index("int_conn_provider_idx").on(table.provider),
		index("int_conn_status_idx").on(table.status),
		index("int_conn_deleted_at_idx").on(table.deletedAt),
		uniqueIndex("int_conn_org_user_provider_unique").on(table.organizationId, table.userId, table.provider),
	],
)

// Type exports
export type IntegrationConnection = typeof integrationConnectionsTable.$inferSelect
export type NewIntegrationConnection = typeof integrationConnectionsTable.$inferInsert
