import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import type { AttachmentId, ChannelId, MessageId, OrganizationId, UserId } from "../lib/schema"

// Attachment status
export const attachmentStatusEnum = pgEnum("attachment_status", ["uploading", "complete", "failed"])

// Attachments table
export const attachmentsTable = pgTable(
	"attachments",
	{
		id: uuid("id").primaryKey().defaultRandom().$type<AttachmentId>(),
		organizationId: uuid().notNull().$type<OrganizationId>(),
		channelId: uuid().$type<ChannelId>(),
		messageId: uuid().$type<MessageId>(),
		fileName: varchar({ length: 255 }).notNull(),
		r2Key: varchar({ length: 500 }).notNull(), // S3/R2 storage key
		uploadedBy: uuid().notNull().$type<UserId>(),
		status: attachmentStatusEnum().notNull().default("uploading"),
		uploadedAt: timestamp({ mode: "date", withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp({ mode: "date", withTimezone: true }),
	},
	(table) => [
		index("attachments_organization_id_idx").on(table.organizationId),
		index("attachments_channel_id_idx").on(table.channelId),
		index("attachments_message_id_idx").on(table.messageId),
		index("attachments_uploaded_by_idx").on(table.uploadedBy),
		index("attachments_status_idx").on(table.status),
		index("attachments_deleted_at_idx").on(table.deletedAt),
	],
)

// Type exports
export type Attachment = typeof attachmentsTable.$inferSelect
export type NewAttachment = typeof attachmentsTable.$inferInsert
