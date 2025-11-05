import { relations } from "drizzle-orm"
import { attachmentsTable } from "./attachments"
import { channelMembersTable, channelsTable } from "./channels"
import { invitationsTable } from "./invitations"
import { messageReactionsTable, messagesTable } from "./messages"
import { notificationsTable } from "./notifications"
import { organizationMembersTable, organizationsTable } from "./organizations"
import { pinnedMessagesTable } from "./pinned-messages"
import { typingIndicatorsTable } from "./typing-indicators"
import { usersTable } from "./users"

// Users relations
export const usersRelations = relations(usersTable, ({ many }) => ({
	organizationMembers: many(organizationMembersTable),
	channelMembers: many(channelMembersTable),
	messages: many(messagesTable),
	messageReactions: many(messageReactionsTable),
	attachments: many(attachmentsTable),
	invitationsSent: many(invitationsTable),
	invitationsAccepted: many(invitationsTable),
	pinnedMessages: many(pinnedMessagesTable),
}))

// Organizations relations
export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
	members: many(organizationMembersTable),
	channels: many(channelsTable),
	invitations: many(invitationsTable),
	attachments: many(attachmentsTable),
}))

// Organization members relations
export const organizationMembersRelations = relations(organizationMembersTable, ({ one, many }) => ({
	organization: one(organizationsTable, {
		fields: [organizationMembersTable.organizationId],
		references: [organizationsTable.id],
	}),
	user: one(usersTable, {
		fields: [organizationMembersTable.userId],
		references: [usersTable.id],
	}),
	invitedByUser: one(usersTable, {
		fields: [organizationMembersTable.invitedBy],
		references: [usersTable.id],
	}),
	notifications: many(notificationsTable),
	typingIndicators: many(typingIndicatorsTable),
}))

// Channels relations
export const channelsRelations = relations(channelsTable, ({ one, many }) => ({
	organization: one(organizationsTable, {
		fields: [channelsTable.organizationId],
		references: [organizationsTable.id],
	}),
	parentChannel: one(channelsTable, {
		fields: [channelsTable.parentChannelId],
		references: [channelsTable.id],
		relationName: "channelThreads",
	}),
	childChannels: many(channelsTable, {
		relationName: "channelThreads",
	}),
	members: many(channelMembersTable),
	messages: many(messagesTable),
	threadMessages: many(messagesTable),
	pinnedMessages: many(pinnedMessagesTable),
	attachments: many(attachmentsTable),
	typingIndicators: many(typingIndicatorsTable),
}))

// Channel members relations
export const channelMembersRelations = relations(channelMembersTable, ({ one }) => ({
	channel: one(channelsTable, {
		fields: [channelMembersTable.channelId],
		references: [channelsTable.id],
	}),
	user: one(usersTable, {
		fields: [channelMembersTable.userId],
		references: [usersTable.id],
	}),
	lastSeenMessage: one(messagesTable, {
		fields: [channelMembersTable.lastSeenMessageId],
		references: [messagesTable.id],
	}),
}))

// Messages relations
export const messagesRelations = relations(messagesTable, ({ one, many }) => ({
	channel: one(channelsTable, {
		fields: [messagesTable.channelId],
		references: [channelsTable.id],
	}),
	author: one(usersTable, {
		fields: [messagesTable.authorId],
		references: [usersTable.id],
	}),
	replyTo: one(messagesTable, {
		fields: [messagesTable.replyToMessageId],
		references: [messagesTable.id],
		relationName: "messageReplies",
	}),
	threadChannel: one(channelsTable, {
		fields: [messagesTable.threadChannelId],
		references: [channelsTable.id],
	}),
	replies: many(messagesTable, {
		relationName: "messageReplies",
	}),
	reactions: many(messageReactionsTable),
	attachments: many(attachmentsTable),
	pinnedIn: many(pinnedMessagesTable),
	seenBy: many(channelMembersTable),
}))

// Message reactions relations
export const messageReactionsRelations = relations(messageReactionsTable, ({ one }) => ({
	message: one(messagesTable, {
		fields: [messageReactionsTable.messageId],
		references: [messagesTable.id],
	}),
	user: one(usersTable, {
		fields: [messageReactionsTable.userId],
		references: [usersTable.id],
	}),
}))

// Attachments relations
export const attachmentsRelations = relations(attachmentsTable, ({ one }) => ({
	organization: one(organizationsTable, {
		fields: [attachmentsTable.organizationId],
		references: [organizationsTable.id],
	}),
	channel: one(channelsTable, {
		fields: [attachmentsTable.channelId],
		references: [channelsTable.id],
	}),
	message: one(messagesTable, {
		fields: [attachmentsTable.messageId],
		references: [messagesTable.id],
	}),
	uploadedBy: one(usersTable, {
		fields: [attachmentsTable.uploadedBy],
		references: [usersTable.id],
	}),
}))

// Invitations relations
export const invitationsRelations = relations(invitationsTable, ({ one }) => ({
	organization: one(organizationsTable, {
		fields: [invitationsTable.organizationId],
		references: [organizationsTable.id],
	}),
	invitedBy: one(usersTable, {
		fields: [invitationsTable.invitedBy],
		references: [usersTable.id],
		relationName: "invitationsSent",
	}),
	acceptedBy: one(usersTable, {
		fields: [invitationsTable.acceptedBy],
		references: [usersTable.id],
		relationName: "invitationsAccepted",
	}),
}))

// Pinned messages relations
export const pinnedMessagesRelations = relations(pinnedMessagesTable, ({ one }) => ({
	channel: one(channelsTable, {
		fields: [pinnedMessagesTable.channelId],
		references: [channelsTable.id],
	}),
	message: one(messagesTable, {
		fields: [pinnedMessagesTable.messageId],
		references: [messagesTable.id],
	}),
	pinnedBy: one(usersTable, {
		fields: [pinnedMessagesTable.pinnedBy],
		references: [usersTable.id],
	}),
}))

// Notifications relations
export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
	member: one(organizationMembersTable, {
		fields: [notificationsTable.memberId],
		references: [organizationMembersTable.id],
	}),
	// Note: targetedResourceId and resourceId can reference different tables
	// These would need to be handled at the application level since they're polymorphic
}))

// Typing indicators relations
export const typingIndicatorsRelations = relations(typingIndicatorsTable, ({ one }) => ({
	channel: one(channelsTable, {
		fields: [typingIndicatorsTable.channelId],
		references: [channelsTable.id],
	}),
	member: one(organizationMembersTable, {
		fields: [typingIndicatorsTable.memberId],
		references: [organizationMembersTable.id],
	}),
}))
