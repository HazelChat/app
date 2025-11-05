import { Schema } from "effect"

export const ChannelId = Schema.UUID.pipe(Schema.brand("@HazelChat/ChannelId")).annotations({
	description: "The ID of the channel where the message is posted",
	title: "Channel ID",
})
export type ChannelId = Schema.Schema.Type<typeof ChannelId>

export const UserId = Schema.UUID.pipe(Schema.brand("@HazelChat/UserId")).annotations({
	description: "The ID of a user",
	title: "UserId ID",
})
export type UserId = Schema.Schema.Type<typeof UserId>

export const MessageId = Schema.UUID.pipe(Schema.brand("@HazelChat/MessageId")).annotations({
	description: "The ID of the message being replied to",
	title: "Reply To Message ID",
})
export type MessageId = Schema.Schema.Type<typeof MessageId>

export const MessageReactionId = Schema.UUID.pipe(Schema.brand("@HazelChat/MessageReactionId")).annotations({
	description: "The ID of the message reaction",
	title: "Message Reaction ID",
})
export type MessageReactionId = Schema.Schema.Type<typeof MessageReactionId>

export const MessageAttachmentId = Schema.UUID.pipe(
	Schema.brand("@HazelChat/MessageAttachmentId"),
).annotations({
	description: "The ID of the message attachment",
	title: "Message Attachment ID",
})
export type MessageAttachmentId = Schema.Schema.Type<typeof MessageAttachmentId>

export const AttachmentId = Schema.UUID.pipe(Schema.brand("@HazelChat/AttachmentId")).annotations({
	description: "The ID of the attachment being replied to",
	title: "Attachment ID",
})
export type AttachmentId = Schema.Schema.Type<typeof AttachmentId>

export const OrganizationId = Schema.UUID.pipe(Schema.brand("@HazelChat/OrganizationId")).annotations({
	description: "The ID of the organization",
	title: "Organization ID",
})
export type OrganizationId = Schema.Schema.Type<typeof OrganizationId>

export const InvitationId = Schema.UUID.pipe(Schema.brand("@HazelChat/InvitationId")).annotations({
	description: "The ID of the invitation",
	title: "Invitation ID",
})
export type InvitationId = Schema.Schema.Type<typeof InvitationId>

export const PinnedMessageId = Schema.UUID.pipe(Schema.brand("@HazelChat/PinnedMessageId")).annotations({
	description: "The ID of the pinned message",
	title: "Pinned Message ID",
})
export type PinnedMessageId = Schema.Schema.Type<typeof PinnedMessageId>

export const NotificationId = Schema.UUID.pipe(Schema.brand("@HazelChat/NotificationId")).annotations({
	description: "The ID of the notification",
	title: "Notification ID",
})
export type NotificationId = Schema.Schema.Type<typeof NotificationId>

export const ChannelMemberId = Schema.UUID.pipe(Schema.brand("@HazelChat/ChannelMemberId")).annotations({
	description: "The ID of the channel member",
	title: "Channel Member ID",
})
export type ChannelMemberId = Schema.Schema.Type<typeof ChannelMemberId>

export const OrganizationMemberId = Schema.UUID.pipe(
	Schema.brand("@HazelChat/OrganizationMemberId"),
).annotations({
	description: "The ID of the organization member",
	title: "Organization Member ID",
})
export type OrganizationMemberId = Schema.Schema.Type<typeof OrganizationMemberId>

export const TypingIndicatorId = Schema.UUID.pipe(Schema.brand("@HazelChat/TypingIndicatorId")).annotations({
	description: "The ID of the typing indicator",
	title: "Typing Indicator ID",
})
export type TypingIndicatorId = Schema.Schema.Type<typeof TypingIndicatorId>

export const UserPresenceStatusId = Schema.UUID.pipe(
	Schema.brand("@HazelChat/UserPresenceStatusId"),
).annotations({
	description: "The ID of the user presence status",
	title: "User Presence Status ID",
})
export type UserPresenceStatusId = Schema.Schema.Type<typeof UserPresenceStatusId>
