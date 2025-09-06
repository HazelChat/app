import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import type { InvitationId, OrganizationId, UserId } from "../lib/schema"

// Invitation status
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired", "revoked"])

// Invitations table
export const invitationsTable = pgTable(
	"invitations",
	{
		id: uuid().primaryKey().defaultRandom().$type<InvitationId>(),
		workosInvitationId: varchar({ length: 255 }).notNull().unique(),
		organizationId: uuid().notNull().$type<OrganizationId>(),
		email: varchar({ length: 255 }).notNull(),
		invitedBy: uuid().$type<UserId>(),
		invitedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		expiresAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
		status: invitationStatusEnum().notNull().default("pending"),
		acceptedAt: timestamp({ mode: "date", withTimezone: true }),
		acceptedBy: uuid().$type<UserId>(),
		createdAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("invitations_workos_id_idx").on(table.workosInvitationId),
		index("invitations_organization_id_idx").on(table.organizationId),
		index("invitations_email_idx").on(table.email),
		index("invitations_status_idx").on(table.status),
	],
)

// Type exports
export type Invitation = typeof invitationsTable.$inferSelect
export type NewInvitation = typeof invitationsTable.$inferInsert
