import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import {
	Attachment,
	Channel,
	ChannelMember,
	DirectMessageParticipant,
	Invitation,
	Message,
	MessageReaction,
	Notification,
	Organization,
	OrganizationMember,
	PinnedMessage,
	User,
} from "@hazel/db/models"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { createCollection } from "@tanstack/react-db"
import { Effect, Schema } from "effect"
import { backendClient } from "~/lib/client"

const electricUrl: string = import.meta.env.VITE_ELECTRIC_URL

export const organizationCollection = createCollection(
	electricCollectionOptions({
		id: "organizations",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "organizations",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Organization.Model.json),
		getKey: (item) => item.id,
	}),
)

export const invitationCollection = createCollection(
	electricCollectionOptions({
		id: "invitations",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "invitations",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Invitation.Model.json),
		getKey: (item) => item.id,
	}),
)

export const messageCollection = createCollection(
	electricCollectionOptions({
		id: "messages",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "messages",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Message.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const { modified: newMessage } = transaction.mutations[0]
			console.log("newMessage", newMessage)
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* backendClient

					return yield* client.messages.create({
						payload: newMessage,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newMessage } = transaction.mutations[0]

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* backendClient

					return yield* client.messages.update({
						payload: newMessage,
						path: {
							id: newMessage.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedMessage } = transaction.mutations[0]

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* backendClient

					return yield* client.messages.delete({
						path: {
							id: deletedMessage.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
	}),
)

export const messageReactionCollection = createCollection(
	electricCollectionOptions({
		id: "message_reactions",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "message_reactions",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(MessageReaction.Model.json),
		getKey: (item) => item.id,
	}),
)

export const pinnedMessageCollection = createCollection(
	electricCollectionOptions({
		id: "pinned_messages",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "pinned_messages",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(PinnedMessage.Model.json),
		getKey: (item) => item.id,
	}),
)

export const notificationCollection = createCollection(
	electricCollectionOptions({
		id: "notifications",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "notifications",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Notification.Model.json),
		getKey: (item) => item.id,
	}),
)

export const userCollection = createCollection(
	electricCollectionOptions({
		id: "users",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "users",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(User.Model.json),
		getKey: (item) => item.id,
	}),
)

export const organizationMemberCollection = createCollection(
	electricCollectionOptions({
		id: "organization_members",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "organization_members",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(OrganizationMember.Model.json),
		getKey: (item) => item.id,
	}),
)

export const channelCollection = createCollection(
	electricCollectionOptions({
		id: "channels",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "channels",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Channel.Model.json),
		getKey: (item) => item.id,
	}),
)

export const channelMemberCollection = createCollection(
	electricCollectionOptions({
		id: "channel_members",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "channel_members",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(ChannelMember.Model.json),
		getKey: (item) => item.id,
	}),
)

export const attachmentCollection = createCollection(
	electricCollectionOptions({
		id: "attachments",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "attachments",
			},
			parser: {
				timestamp: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Attachment.Model.json),
		getKey: (item) => item.id,
	}),
)

export const directMessageParticipantCollection = createCollection(
	electricCollectionOptions({
		id: "direct_message_participants",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "direct_message_participants",
			},
		},
		schema: Schema.standardSchemaV1(DirectMessageParticipant.Model.json),
		getKey: (item) => item.id,
	}),
)
