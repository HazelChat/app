import {
	Attachment,
	Channel,
	ChannelMember,
	Invitation,
	Message,
	MessageReaction,
	Notification,
	Organization,
	OrganizationMember,
	PinnedMessage,
	TypingIndicator,
	User,
	UserPresenceStatus,
} from "@hazel/domain/models"
import { effectElectricCollectionOptions } from "@hazel/effect-electric-db-collection"
import { createCollection } from "@tanstack/react-db"
import { Effect, Schema } from "effect"
import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"
import { runtime } from "~/lib/services/common/runtime"
import {
	createCollectionErrorHandler,
	registerCollection,
} from "~/lib/services/electric-collection-error-handler"

const electricUrl: string = import.meta.env.VITE_ELECTRIC_URL

export const organizationCollection = createCollection(
	effectElectricCollectionOptions({
		id: "organizations",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "organizations",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},

			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("organizations"),
		},
		schema: Schema.standardSchemaV1(Organization.Model.json),
		getKey: (item) => item.id,
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganization } = transaction.mutations[0]

				console.log(newOrganization)

				const client = yield* HazelRpcClient

				const results = yield* client("organization.update", newOrganization)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedOrganization } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("organization.delete", {
					id: deletedOrganization.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const invitationCollection = createCollection(
	effectElectricCollectionOptions({
		id: "invitations",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "invitations",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("invitations"),
		},
		schema: Schema.standardSchemaV1(Invitation.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newInvitation } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("invitation.create", {
					organizationId: newInvitation.organizationId,
					invites: [
						{
							email: newInvitation.email,
							role: "member" as const,
						},
					],
				})

				// Use the transaction ID from the first result if available
				const firstResult = results.results[0]
				const txid = firstResult?.transactionId ?? 0

				return { txid }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newInvitation } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("invitation.update", newInvitation)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedInvitation } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("invitation.delete", { id: deletedInvitation.id })

				return { txid: results.transactionId }
			}),
	}),
)

export const messageCollection = createCollection(
	effectElectricCollectionOptions({
		id: "messages",
		syncMode: "on-demand",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "messages",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("messages"),
		},
		schema: Schema.standardSchemaV1(Message.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessage } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("message.create", newMessage)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessage } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("message.update", newMessage)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedMessage } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("message.delete", { id: deletedMessage.id })

				return { txid: results.transactionId }
			}),
	}),
)

export const messageReactionCollection = createCollection(
	effectElectricCollectionOptions({
		id: "message_reactions",
		syncMode: "on-demand",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "message_reactions",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("message_reactions"),
		},
		schema: Schema.standardSchemaV1(MessageReaction.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessageReaction } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("messageReaction.create", newMessageReaction)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessageReaction } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("messageReaction.update", newMessageReaction)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedMessageReaction } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("messageReaction.delete", {
					id: deletedMessageReaction.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const pinnedMessageCollection = createCollection(
	effectElectricCollectionOptions({
		id: "pinned_messages",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "pinned_messages",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("pinned_messages"),
		},
		schema: Schema.standardSchemaV1(PinnedMessage.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newPinnedMessage } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("pinnedMessage.create", newPinnedMessage)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newPinnedMessage } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("pinnedMessage.update", newPinnedMessage)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedPinnedMessage } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("pinnedMessage.delete", {
					id: deletedPinnedMessage.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const notificationCollection = createCollection(
	effectElectricCollectionOptions({
		id: "notifications",
		syncMode: "on-demand",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "notifications",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("notifications"),
		},
		schema: Schema.standardSchemaV1(Notification.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newNotification } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("notification.create", newNotification)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newNotification } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("notification.update", newNotification)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedNotification } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("notification.delete", { id: deletedNotification.id })

				return { txid: results.transactionId }
			}),
	}),
)

export const userCollection = createCollection(
	effectElectricCollectionOptions({
		id: "users",
		// syncMode: "progressive",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "users",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("users"),
		},
		schema: Schema.standardSchemaV1(User.Model.json),
		getKey: (item) => item.id,
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUser } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("user.update", newUser)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedUser } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("user.delete", {
					id: deletedUser.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const organizationMemberCollection = createCollection(
	effectElectricCollectionOptions({
		id: "organization_members",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "organization_members",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("organization_members"),
		},
		schema: Schema.standardSchemaV1(OrganizationMember.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganizationMember } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("organizationMember.create", newOrganizationMember)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganizationMember } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("organizationMember.update", newOrganizationMember)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedOrganizationMember } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("organizationMember.delete", {
					id: deletedOrganizationMember.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const channelCollection = createCollection(
	effectElectricCollectionOptions({
		id: "channels",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "channels",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("channels"),
		},
		schema: Schema.standardSchemaV1(Channel.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannel } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("channel.create", newChannel)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannel } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("channel.update", newChannel)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedChannel } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("channel.delete", {
					id: deletedChannel.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const channelMemberCollection = createCollection(
	effectElectricCollectionOptions({
		id: "channel_members",
		// syncMode: "progressive",
		runtime: runtime,
		shapeOptions: {
			url: `${electricUrl}`,
			params: {
				table: "channel_members",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("channel_members"),
		},
		schema: Schema.standardSchemaV1(ChannelMember.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannelMember } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("channelMember.create", newChannelMember)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannelMember } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("channelMember.update", newChannelMember)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedChannelMember } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("channelMember.delete", {
					id: deletedChannelMember.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const attachmentCollection = createCollection(
	effectElectricCollectionOptions({
		id: "attachments",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "attachments",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("attachments"),
		},
		schema: Schema.standardSchemaV1(Attachment.Model.json),
		getKey: (item) => item.id,
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedAttachment } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("attachment.delete", {
					id: deletedAttachment.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const typingIndicatorCollection = createCollection(
	effectElectricCollectionOptions({
		id: "typing_indicators",
		syncMode: "on-demand",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "typing_indicators",
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("typing_indicators"),
		},
		schema: Schema.standardSchemaV1(TypingIndicator.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newTypingIndicator } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("typingIndicator.create", {
					channelId: newTypingIndicator.channelId,
					memberId: newTypingIndicator.memberId,
					lastTyped: newTypingIndicator.lastTyped,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newTypingIndicator } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("typingIndicator.update", {
					id: newTypingIndicator.id,
					lastTyped: newTypingIndicator.lastTyped,
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedTypingIndicator } = transaction.mutations[0]
				const client = yield* HazelRpcClient

				const results = yield* client("typingIndicator.delete", {
					id: deletedTypingIndicator.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const userPresenceStatusCollection = createCollection(
	effectElectricCollectionOptions({
		id: "user_presence_status",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "user_presence_status",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
			fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
			onError: createCollectionErrorHandler("user_presence_status"),
		},
		schema: Schema.standardSchemaV1(UserPresenceStatus.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUserPresenceStatus } = transaction.mutations[0]
				const client = yield* HazelRpcClient
				const results = yield* client("userPresenceStatus.update", {
					status: newUserPresenceStatus.status,
					customMessage: newUserPresenceStatus.customMessage,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUserPresenceStatus } = transaction.mutations[0]

				const client = yield* HazelRpcClient

				const results = yield* client("userPresenceStatus.update", {
					status: newUserPresenceStatus.status,
					customMessage: newUserPresenceStatus.customMessage,
				})

				return { txid: results.transactionId }
			}),
	}),
)

// Register all collections for error handling and retry
registerCollection("organizations", () => organizationCollection.preload())
registerCollection("invitations", () => invitationCollection.preload())
registerCollection("messages", () => messageCollection.preload())
registerCollection("message_reactions", () => messageReactionCollection.preload())
registerCollection("pinned_messages", () => pinnedMessageCollection.preload())
registerCollection("notifications", () => notificationCollection.preload())
registerCollection("users", () => userCollection.preload())
registerCollection("organization_members", () => organizationMemberCollection.preload())
registerCollection("channels", () => channelCollection.preload())
registerCollection("channel_members", () => channelMemberCollection.preload())
registerCollection("attachments", () => attachmentCollection.preload())
registerCollection("typing_indicators", () => typingIndicatorCollection.preload())
registerCollection("user_presence_status", () => userPresenceStatusCollection.preload())
