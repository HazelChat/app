import { Schema } from "effect"

export const ChannelId = Schema.UUID.pipe(Schema.brand("@HazelChat/ChannelId")).annotations({
	description: "The ID of the channel where the message is posted",
	title: "Channel ID",
})
export const UserId = Schema.UUID.pipe(Schema.brand("@HazelChat/UserId")).annotations({
	description: "The ID of a user",
	title: "UserId ID",
})
export const MessageId = Schema.UUID.pipe(Schema.brand("@HazelChat/MessageId")).annotations({
	description: "The ID of the message being replied to",
	title: "Reply To Message ID",
})

export const AttachmentId = Schema.UUID.pipe(Schema.brand("@HazelChat/AttachmentId")).annotations({
	description: "The ID of the attachment being replied to",
	title: "Attachment ID",
})

export const OrganizationId = Schema.UUID.pipe(Schema.brand("@HazelChat/OrganizationId")).annotations({
	description: "The ID of the organization",
	title: "Organization ID",
})
