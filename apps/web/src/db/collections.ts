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
	UserPresenceStatus,
} from "@hazel/db/models"
import { effectElectricCollectionOptions } from "@hazel/effect-electric-db-collection"
import { createCollection } from "@tanstack/react-db"
import { Effect, Layer, Logger, ManagedRuntime, Schema } from "effect"
import { ApiClient } from "~/lib/services/common/api-client"
import { RpcClient } from "~/lib/services/common/rpc-client"
import { runtime } from "~/lib/services/common/runtime"

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
		},
		schema: Schema.standardSchemaV1(Organization.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganization } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.OrganizationCreate(newOrganization)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganization } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.OrganizationUpdate(newOrganization)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedOrganization } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.OrganizationDelete({
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
		},
		schema: Schema.standardSchemaV1(Invitation.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newInvitation } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.InvitationCreate(newInvitation)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newInvitation } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.InvitationUpdate(newInvitation)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedInvitation } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.InvitationDelete({ id: deletedInvitation.id })

				return { txid: results.transactionId }
			}),
	}),
)

export const messageCollection = createCollection(
	effectElectricCollectionOptions({
		id: "messages",
		runtime: runtime,
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
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessage } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.MessageCreate(newMessage)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessage } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.MessageUpdate(newMessage)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedMessage } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.MessageDelete({ id: deletedMessage.id })

				return { txid: results.transactionId }
			}),
	}),
)

export const messageReactionCollection = createCollection(
	effectElectricCollectionOptions({
		id: "message_reactions",
		runtime: runtime,
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
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessageReaction } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.MessageReactionCreate(newMessageReaction)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessageReaction } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.MessageReactionUpdate(newMessageReaction)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedMessageReaction } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.MessageReactionDelete({
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
		},
		schema: Schema.standardSchemaV1(PinnedMessage.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newPinnedMessage } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.PinnedMessageCreate(newPinnedMessage)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newPinnedMessage } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.PinnedMessageUpdate(newPinnedMessage)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedPinnedMessage } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.PinnedMessageDelete({
					id: deletedPinnedMessage.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const notificationCollection = createCollection(
	effectElectricCollectionOptions({
		id: "notifications",
		runtime: runtime,
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
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newNotification } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.NotificationCreate(newNotification)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newNotification } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.NotificationUpdate(newNotification)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedNotification } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.NotificationDelete({ id: deletedNotification.id })

				return { txid: results.transactionId }
			}),
	}),
)

export const userCollection = createCollection(
	effectElectricCollectionOptions({
		id: "users",
		runtime: runtime,
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
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUser } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.UserCreate(newUser)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUser } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.UserUpdate(newUser)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedUser } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.UserDelete({
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
		},
		schema: Schema.standardSchemaV1(OrganizationMember.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganizationMember } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.OrganizationMemberCreate(newOrganizationMember)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganizationMember } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.OrganizationMemberUpdate(newOrganizationMember)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedOrganizationMember } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.OrganizationMemberDelete({
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
		},
		schema: Schema.standardSchemaV1(Channel.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannel } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.ChannelCreate(newChannel)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannel } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.ChannelUpdate(newChannel)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedChannel } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.ChannelDelete({
					id: deletedChannel.id,
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const channelMemberCollection = createCollection(
	effectElectricCollectionOptions({
		id: "channel_members",
		runtime: runtime,
		shapeOptions: {
			url: `${electricUrl}`,
			params: {
				table: "channel_members",
			},
			parser: {
				timestamptz: (date) => new Date(date),
			},
		},
		schema: Schema.standardSchemaV1(ChannelMember.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannelMember } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.ChannelMemberCreate(newChannelMember)

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannelMember } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.ChannelMemberUpdate(newChannelMember)

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedChannelMember } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.ChannelMemberDelete({
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
		},
		schema: Schema.standardSchemaV1(Attachment.Model.json),
		getKey: (item) => item.id,
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedAttachment } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.attachments.delete({
					path: {
						id: deletedAttachment.id,
					},
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const directMessageParticipantCollection = createCollection(
	effectElectricCollectionOptions({
		id: "direct_message_participants",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "direct_message_participants",
			},
		},
		schema: Schema.standardSchemaV1(DirectMessageParticipant.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newDirectMessageParticipant } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.directMessageParticipants.create({
					payload: newDirectMessageParticipant,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newDirectMessageParticipant } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.directMessageParticipants.update({
					payload: newDirectMessageParticipant,
					path: {
						id: newDirectMessageParticipant.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedDirectMessageParticipant } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.directMessageParticipants.delete({
					path: {
						id: deletedDirectMessageParticipant.id,
					},
				})

				return { txid: results.transactionId }
			}),
	}),
)

export const typingIndicatorCollection = createCollection(
	effectElectricCollectionOptions({
		id: "typing_indicators",
		runtime: runtime,
		shapeOptions: {
			url: electricUrl,
			params: {
				table: "typing_indicators",
			},
		},
		schema: Schema.standardSchemaV1(TypingIndicator.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newTypingIndicator } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.TypingIndicatorCreate({
					channelId: newTypingIndicator.channelId,
					memberId: newTypingIndicator.memberId,
					lastTyped: newTypingIndicator.lastTyped,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newTypingIndicator } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.TypingIndicatorUpdate({
					id: newTypingIndicator.id,
					lastTyped: newTypingIndicator.lastTyped,
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedTypingIndicator } = transaction.mutations[0]
				const client = yield* RpcClient

				const results = yield* client.TypingIndicatorDelete({
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
		},
		schema: Schema.standardSchemaV1(UserPresenceStatus.Model.json),
		getKey: (item) => item.id,
		onInsert: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUserPresenceStatus } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.presence.updateStatus({
					payload: {
						status: newUserPresenceStatus.status,
						customMessage: newUserPresenceStatus.customMessage,
					},
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUserPresenceStatus } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.presence.updateStatus({
					payload: {
						status: newUserPresenceStatus.status,
						customMessage: newUserPresenceStatus.customMessage,
					},
				})

				return { txid: results.transactionId }
			}),
	}),
)
