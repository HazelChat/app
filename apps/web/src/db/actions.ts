import {
	AttachmentId,
	ChannelId,
	ChannelMemberId,
	DirectMessageParticipantId,
	MessageId,
	type OrganizationId,
	type UserId,
} from "@hazel/db/schema"
import {
	createCollection,
	createOptimisticAction,
	eq,
	inArray,
	liveQueryCollectionOptions,
	or,
} from "@tanstack/react-db"
import { Effect } from "effect"
import { v4 as uuid } from "uuid"
import { ApiClient } from "~/lib/services/common/api-client"
import { runtime } from "~/lib/services/common/runtime"
import {
	attachmentCollection,
	channelCollection,
	channelMemberCollection,
	directMessageParticipantCollection,
	messageCollection,
} from "./collections"

export const uploadAttachment = createOptimisticAction<{
	organizationId: OrganizationId
	file: File
	channelId: ChannelId
	userId: UserId
	attachmentId?: AttachmentId
}>({
	onMutate: (props) => {
		const attachmentId = props.attachmentId || AttachmentId.make(uuid())

		attachmentCollection.insert({
			id: attachmentId,
			organizationId: props.organizationId,
			channelId: props.channelId,
			messageId: null,
			fileName: props.file.name,
			fileSize: props.file.size,
			uploadedBy: props.userId,
			status: "complete" as const,
			uploadedAt: new Date(),
		})

		return { attachmentId }
	},
	mutationFn: async (props, _params) => {
		const formData = new FormData()
		// Ensure file name is included when appending file
		formData.append("file", props.file, props.file.name)
		formData.append("organizationId", props.organizationId)
		formData.append("channelId", props.channelId)
		formData.append("fileName", props.file.name) // Also send file name separately

		const { transactionId } = await runtime.runPromise(
			Effect.gen(function* () {
				const client = yield* ApiClient

				return yield* client.attachments.upload({
					payload: formData,
				})
			}),
		)

		await attachmentCollection.utils.awaitTxId(transactionId)

		return { transactionId }
	},
})

export const sendMessage = createOptimisticAction<{
	channelId: ChannelId
	authorId: UserId
	content: string
	replyToMessageId?: MessageId | null
	threadChannelId?: ChannelId | null
	attachmentIds?: AttachmentId[]
}>({
	onMutate: (props) => {
		const messageId = MessageId.make(uuid())

		messageCollection.insert({
			id: messageId,
			channelId: props.channelId,
			authorId: props.authorId,
			content: props.content,
			replyToMessageId: props.replyToMessageId || null,
			threadChannelId: props.threadChannelId || null,
			createdAt: new Date(),
			updatedAt: null,
			deletedAt: null,
		})

		return { messageId }
	},
	mutationFn: async (props, _params) => {
		const { transactionId } = await runtime.runPromise(
			Effect.gen(function* () {
				const client = yield* ApiClient

				// Create the message with attachmentIds
				return yield* client.messages.create({
					payload: {
						channelId: props.channelId,
						content: props.content,
						replyToMessageId: props.replyToMessageId || null,
						threadChannelId: props.threadChannelId || null,
						attachmentIds: props.attachmentIds || [],
						deletedAt: null,
						authorId: props.authorId,
					},
				})
			}),
		)

		await messageCollection.utils.awaitTxId(transactionId)

		return { transactionId }
	},
})

export const createDmChannel = createOptimisticAction<{
	organizationId: OrganizationId
	participantIds: UserId[]
	type: "single" | "direct"
	name?: string
	currentUserId: UserId
}>({
	onMutate: (props) => {
		const channelId = ChannelId.make(uuid())
		const now = new Date()

		let channelName = props.name
		if (props.type === "single" && props.participantIds.length === 1) {
			channelName = channelName || "Direct Message"
		}

		// Optimistically insert the channel
		channelCollection.insert({
			id: channelId,
			name: channelName || "Group Channel",
			type: props.type === "direct" ? "single" : "direct",
			organizationId: props.organizationId,
			parentChannelId: null,
			createdAt: now,
			updatedAt: null,
			deletedAt: null,
		})

		// Add current user as member
		channelMemberCollection.insert({
			id: ChannelMemberId.make(uuid()),
			channelId: channelId,
			userId: props.currentUserId,
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			lastSeenMessageId: null,
			notificationCount: 0,
			joinedAt: now,
			createdAt: now,
			deletedAt: null,
		})

		// Add all participants as members
		for (const participantId of props.participantIds) {
			channelMemberCollection.insert({
				id: ChannelMemberId.make(uuid()),
				channelId: channelId,
				userId: participantId,
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				lastSeenMessageId: null,
				notificationCount: 0,
				joinedAt: now,
				createdAt: now,
				deletedAt: null,
			})
		}

		// For DMs, add to direct_message_participants
		if (props.type === "direct" && props.participantIds.length > 0) {
			// Add current user
			directMessageParticipantCollection.insert({
				id: DirectMessageParticipantId.make(uuid()),
				channelId: channelId,
				userId: props.currentUserId,
				organizationId: props.organizationId,
			})

			// Add other participant
			directMessageParticipantCollection.insert({
				id: DirectMessageParticipantId.make(uuid()),
				channelId: channelId,
				userId: props.participantIds[0]!,
				organizationId: props.organizationId,
			})
		}

		return { channelId }
	},
	mutationFn: async (props, _params) => {
		const { transactionId, data } = await runtime.runPromise(
			Effect.gen(function* () {
				const client = yield* ApiClient

				return yield* client.channels.createDm({
					payload: {
						organizationId: props.organizationId,
						participantIds: props.participantIds,
						type: props.type,
						name: props.name,
					},
				})
			}),
		)

		await channelCollection.utils.awaitTxId(transactionId)
		await channelMemberCollection.utils.awaitTxId(transactionId)
		await directMessageParticipantCollection.utils.awaitTxId(transactionId)

		return { transactionId, channelId: data.id }
	},
})
