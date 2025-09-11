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
	TypingIndicator,
	User,
} from "@hazel/db/models"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { createCollection } from "@tanstack/react-db"
import { Effect, Schema } from "effect"
import { getBackendClient } from "~/lib/client"
import { authClient } from "~/providers/workos-provider"

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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Organization.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const { modified: newOrganization } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.organizations.create({
						payload: newOrganization,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newOrganization } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.organizations.update({
						payload: newOrganization,
						path: {
							id: newOrganization.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedOrganization } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.organizations.delete({
						path: {
							id: deletedOrganization.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Invitation.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newInvitation } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.invitations.create({
						payload: newInvitation,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newInvitation } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.invitations.update({
						payload: newInvitation,
						path: {
							id: newInvitation.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedInvitation } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.invitations.delete({
						path: {
							id: deletedInvitation.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Message.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const { modified: newMessage } = transaction.mutations[0]

			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.messages.create({
						payload: newMessage,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newMessage } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

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
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(MessageReaction.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newMessageReaction } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.messageReactions.create({
						payload: newMessageReaction,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newMessageReaction } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.messageReactions.update({
						payload: newMessageReaction,
						path: {
							id: newMessageReaction.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedMessageReaction } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.messageReactions.delete({
						path: {
							id: deletedMessageReaction.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(PinnedMessage.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newPinnedMessage } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.pinnedMessages.create({
						payload: newPinnedMessage,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newPinnedMessage } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.pinnedMessages.update({
						payload: newPinnedMessage,
						path: {
							id: newPinnedMessage.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedPinnedMessage } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.pinnedMessages.delete({
						path: {
							id: deletedPinnedMessage.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Notification.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newNotification } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.notifications.create({
						payload: newNotification,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newNotification } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.notifications.update({
						payload: newNotification,
						path: {
							id: newNotification.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedNotification } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.notifications.delete({
						path: {
							id: deletedNotification.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(User.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newUser } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.users.create({
						payload: newUser,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newUser } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.users.update({
						payload: newUser,
						path: {
							id: newUser.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedUser } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.users.delete({
						path: {
							id: deletedUser.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(OrganizationMember.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newOrganizationMember } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.organizationMembers.create({
						payload: newOrganizationMember,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newOrganizationMember } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.organizationMembers.update({
						payload: newOrganizationMember,
						path: {
							id: newOrganizationMember.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedOrganizationMember } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.organizationMembers.delete({
						path: {
							id: deletedOrganizationMember.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Channel.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const { modified: newChannel } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.channels.create({
						payload: newChannel,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newChannel } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.channels.update({
						payload: newChannel,
						path: {
							id: newChannel.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedChannel } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.channels.delete({
						path: {
							id: deletedChannel.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(ChannelMember.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const { modified: newChannelMember } = transaction.mutations[0]

			console.log("newChannelMember", newChannelMember)
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.channelMembers.create({
						payload: newChannelMember,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newChannelMember } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.channelMembers.update({
						payload: newChannelMember,
						path: {
							id: newChannelMember.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedChannelMember } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.channelMembers.delete({
						path: {
							id: deletedChannelMember.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(Attachment.Model.json),
		getKey: (item) => item.id,
		onDelete: async ({ transaction }) => {
			const { original: deletedAttachment } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.attachments.delete({
						path: {
							id: deletedAttachment.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
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
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newDirectMessageParticipant } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.directMessageParticipants.create({
						payload: newDirectMessageParticipant,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newDirectMessageParticipant } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.directMessageParticipants.update({
						payload: newDirectMessageParticipant,
						path: {
							id: newDirectMessageParticipant.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedDirectMessageParticipant } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.directMessageParticipants.delete({
						path: {
							id: deletedDirectMessageParticipant.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
	}),
)

export const typingIndicatorCollection = createCollection(
	electricCollectionOptions({
		id: "typing_indicators",
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "typing_indicators",
			},
		},
		schema: Schema.standardSchemaV1(TypingIndicator.Model.json),
		getKey: (item) => item.id,
		onInsert: async ({ transaction }) => {
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()
			const { modified: newTypingIndicator } = transaction.mutations[0]
			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.typingIndicators.create({
						payload: newTypingIndicator,
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: newTypingIndicator } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.typingIndicators.update({
						payload: newTypingIndicator,
						path: {
							id: newTypingIndicator.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
		onDelete: async ({ transaction }) => {
			const { original: deletedTypingIndicator } = transaction.mutations[0]
			const workOsClient = await authClient
			const _accessToken = await workOsClient.getAccessToken()

			const results = await Effect.runPromise(
				Effect.gen(function* () {
					const client = yield* getBackendClient(_accessToken)

					return yield* client.typingIndicators.delete({
						path: {
							id: deletedTypingIndicator.id,
						},
					})
				}),
			)

			return { txid: results.transactionId }
		},
	}),
)
