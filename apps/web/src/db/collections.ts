import {
	Attachment,
	Channel,
	ChannelMember,
	IntegrationConnection,
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
import { createEffectCollection } from "@hazel/effect-electric-db-collection"
import { Effect } from "effect"
import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"
import { runtime } from "~/lib/services/common/runtime"

const electricUrl: string = import.meta.env.VITE_ELECTRIC_URL

export const organizationCollection = createEffectCollection({
	id: "organizations",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,

		params: {
			table: "organizations",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},

		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Organization.Model.json,
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
})

export const invitationCollection = createEffectCollection({
	id: "invitations",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "invitations",
		},
		liveSse: true,
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Invitation.Model.json,
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
})

export const messageCollection = createEffectCollection({
	id: "messages",
	// syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "messages",
		},
		// liveSse: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Parser type assertion needed due to complex JSONB embeds field
		parser: {
			timestamptz: (date: string) => new Date(date),
		} as any,
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Message.Model.json,
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
})

export const messageReactionCollection = createEffectCollection({
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
	},
	schema: MessageReaction.Model.json,
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
})

export const pinnedMessageCollection = createEffectCollection({
	id: "pinned_messages",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		params: {
			table: "pinned_messages",
		},
		liveSse: true,
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: PinnedMessage.Model.json,
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
})

export const notificationCollection = createEffectCollection({
	id: "notifications",
	syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "notifications",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Notification.Model.json,
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
})

export const userCollection = createEffectCollection({
	id: "users",
	// syncMode: "progressive",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "users",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: User.Model.json,
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
})

export const organizationMemberCollection = createEffectCollection({
	id: "organization_members",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "organization_members",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: OrganizationMember.Model.json,
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
})

export const channelCollection = createEffectCollection({
	id: "channels",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "channels",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Channel.Model.json,
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
})

export const channelMemberCollection = createEffectCollection({
	id: "channel_members",
	// syncMode: "progressive",
	runtime: runtime,
	shapeOptions: {
		url: `${electricUrl}`,
		liveSse: true,
		params: {
			table: "channel_members",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: ChannelMember.Model.json,
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
})

export const attachmentCollection = createEffectCollection({
	id: "attachments",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "attachments",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: Attachment.Model.json,
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
})

export const typingIndicatorCollection = createEffectCollection({
	id: "typing_indicators",
	syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "typing_indicators",
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: TypingIndicator.Model.json,
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
})

export const userPresenceStatusCollection = createEffectCollection({
	id: "user_presence_status",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "user_presence_status",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: UserPresenceStatus.Model.json,
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
})

export const integrationConnectionCollection = createEffectCollection({
	id: "integration_connections",
	// syncMode: "on-demand",
	runtime: runtime,
	shapeOptions: {
		url: electricUrl,
		liveSse: true,
		params: {
			table: "integration_connections",
		},
		parser: {
			timestamptz: (date) => new Date(date),
		},
		fetchClient: (url, init) => fetch(url, { ...init, credentials: "include" }),
	},
	schema: IntegrationConnection.Model.json,
	getKey: (item) => item.id,
})
