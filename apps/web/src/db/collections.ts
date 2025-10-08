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
				const client = yield* ApiClient

				const results = yield* client.organizations.create({
					payload: newOrganization,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganization } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.organizations.update({
					payload: newOrganization,
					path: {
						id: newOrganization.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedOrganization } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.organizations.delete({
					path: {
						id: deletedOrganization.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.invitations.create({
					payload: newInvitation,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newInvitation } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.invitations.update({
					payload: newInvitation,
					path: {
						id: newInvitation.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedInvitation } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.invitations.delete({
					path: {
						id: deletedInvitation.id,
					},
				})

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
				const client = yield* ApiClient

				const results = yield* client.messages.create({
					payload: newMessage,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessage } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.messages.update({
					payload: newMessage,
					path: {
						id: newMessage.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedMessage } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.messages.delete({
					path: {
						id: deletedMessage.id,
					},
				})

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
				const client = yield* ApiClient

				const results = yield* client.messageReactions.create({
					payload: newMessageReaction,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newMessageReaction } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.messageReactions.update({
					payload: newMessageReaction,
					path: {
						id: newMessageReaction.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedMessageReaction } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.messageReactions.delete({
					path: {
						id: deletedMessageReaction.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.pinnedMessages.create({
					payload: newPinnedMessage,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newPinnedMessage } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.pinnedMessages.update({
					payload: newPinnedMessage,
					path: {
						id: newPinnedMessage.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedPinnedMessage } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.pinnedMessages.delete({
					path: {
						id: deletedPinnedMessage.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.notifications.create({
					payload: newNotification,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newNotification } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.notifications.update({
					payload: newNotification,
					path: {
						id: newNotification.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedNotification } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.notifications.delete({
					path: {
						id: deletedNotification.id,
					},
				})

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
				const client = yield* ApiClient

				const results = yield* client.users.create({
					payload: newUser,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newUser } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.users.update({
					payload: newUser,
					path: {
						id: newUser.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedUser } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.users.delete({
					path: {
						id: deletedUser.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.organizationMembers.create({
					payload: newOrganizationMember,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newOrganizationMember } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.organizationMembers.update({
					payload: newOrganizationMember,
					path: {
						id: newOrganizationMember.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedOrganizationMember } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.organizationMembers.delete({
					path: {
						id: deletedOrganizationMember.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.channels.create({
					payload: newChannel,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannel } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.channels.update({
					payload: newChannel,
					path: {
						id: newChannel.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedChannel } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.channels.delete({
					path: {
						id: deletedChannel.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.channelMembers.create({
					payload: newChannelMember,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newChannelMember } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.channelMembers.update({
					payload: newChannelMember,
					path: {
						id: newChannelMember.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedChannelMember } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.channelMembers.delete({
					path: {
						id: deletedChannelMember.id,
					},
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
				const client = yield* ApiClient

				const results = yield* client.typingIndicators.create({
					payload: newTypingIndicator,
				})

				return { txid: results.transactionId }
			}),
		onUpdate: ({ transaction }) =>
			Effect.gen(function* () {
				const { modified: newTypingIndicator } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.typingIndicators.update({
					payload: newTypingIndicator,
					path: {
						id: newTypingIndicator.id,
					},
				})

				return { txid: results.transactionId }
			}),
		onDelete: ({ transaction }) =>
			Effect.gen(function* () {
				const { original: deletedTypingIndicator } = transaction.mutations[0]
				const client = yield* ApiClient

				const results = yield* client.typingIndicators.delete({
					path: {
						id: deletedTypingIndicator.id,
					},
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

