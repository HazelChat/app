import { sql } from "drizzle-orm"
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import type { OrganizationId, OrganizationMemberId, UserId } from "../lib/schema"

// Organization member roles
export const organizationRoleEnum = pgEnum("organization_role", ["admin", "member", "owner"])

// Organizations table
export const organizationsTable = pgTable(
	"organizations",
	{
		id: uuid().primaryKey().defaultRandom().$type<OrganizationId>(),
		workosId: varchar({ length: 255 }).notNull().unique(),
		name: varchar({ length: 255 }).notNull(),
		slug: varchar({ length: 100 }).unique(),
		logoUrl: text(),
		settings: jsonb(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("organizations_workos_id_idx").on(table.workosId),
		index("organizations_slug_idx").on(table.slug),
		index("organizations_deleted_at_idx").on(table.deletedAt),
	],
)

// Organization members junction table
export const organizationMembersTable = pgTable(
	"organization_members",
	{
		id: uuid().primaryKey().defaultRandom().$type<OrganizationMemberId>(),
		organizationId: uuid()
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" })
			.$type<OrganizationId>(),
		userId: uuid().notNull().$type<UserId>(),
		role: organizationRoleEnum().notNull().default("member"),
		joinedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		invitedBy: uuid().$type<UserId>(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("org_members_organization_id_idx").on(table.organizationId),
		index("org_members_user_id_idx").on(table.userId),
		index("org_members_org_user_idx").on(table.organizationId, table.userId),
	],
)

// Type exports
export type Organization = typeof organizationsTable.$inferSelect
export type NewOrganization = typeof organizationsTable.$inferInsert
export type OrganizationMember = typeof organizationMembersTable.$inferSelect
export type NewOrganizationMember = typeof organizationMembersTable.$inferInsert
