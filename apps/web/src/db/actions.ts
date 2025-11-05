import {
	type AttachmentId,
	ChannelId,
	ChannelMemberId,
	MessageId,
	MessageReactionId,
	OrganizationId,
	type UserId,
} from "@hazel/db/schema"
import { createEffectOptimisticAction } from "@hazel/effect-electric-db-collection"
import { Effect } from "effect"
import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"
import { runtime } from "~/lib/services/common/runtime"
import {
	channelCollection,
	channelMemberCollection,
	messageCollection,
	messageReactionCollection,
	organizationCollection,
} from "./collections"

export const sendMessageEffect = createEffectOptimisticAction({
	onMutate: (props: {
		channelId: ChannelId
		authorId: UserId
		content: string
		replyToMessageId?: MessageId | null
		threadChannelId?: ChannelId | null
		attachmentIds?: AttachmentId[]
	}) => {
		const messageId = MessageId.make(crypto.randomUUID())

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
	mutationFn: (
		props: {
			channelId: ChannelId
			authorId: UserId
			content: string
			replyToMessageId?: MessageId | null
			threadChannelId?: ChannelId | null
			attachmentIds?: AttachmentId[]
		},
		_params,
	) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			// Create the message with attachmentIds using RPC
			// Note: authorId will be overridden by backend AuthMiddleware with the authenticated user
			const result = yield* client("message.create", {
				channelId: props.channelId,
				content: props.content,
				replyToMessageId: props.replyToMessageId || null,
				threadChannelId: props.threadChannelId || null,
				attachmentIds: props.attachmentIds || [],
				deletedAt: null,
				authorId: props.authorId,
			})
			// Wait for the transaction to sync
			yield* Effect.promise(() => messageCollection.utils.awaitTxId(result.transactionId))

			return result
		}),
	runtime: runtime,
})

export const createDmChannel = createEffectOptimisticAction({
	onMutate: (props: {
		organizationId: OrganizationId
		participantIds: UserId[]
		type: "single" | "direct"
		name?: string
		currentUserId: UserId
	}) => {
		const channelId = ChannelId.make(crypto.randomUUID())
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
			id: ChannelMemberId.make(crypto.randomUUID()),
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
				id: ChannelMemberId.make(crypto.randomUUID()),
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

		return { channelId }
	},
	mutationFn: (
		props: {
			organizationId: OrganizationId
			participantIds: UserId[]
			type: "single" | "direct"
			name?: string
			currentUserId: UserId
		},
		_params,
	) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			const result = yield* client("channel.createDm", {
				organizationId: props.organizationId,
				participantIds: props.participantIds,
				type: props.type,
				name: props.name,
			})

			// Wait for all collections to sync
			yield* Effect.all([
				Effect.promise(() => channelCollection.utils.awaitTxId(result.transactionId)),
				Effect.promise(() => channelMemberCollection.utils.awaitTxId(result.transactionId)),
			])

			return { transactionId: result.transactionId, channelId: result.data.id }
		}),
	runtime: runtime,
})

export const createOrganization = createEffectOptimisticAction({
	onMutate: (props: { name: string; slug: string; logoUrl?: string | null }) => {
		const organizationId = OrganizationId.make(crypto.randomUUID())
		const now = new Date()

		// Optimistically insert the organization
		// Note: workosId will be set by backend after creating org in WorkOS
		organizationCollection.insert({
			id: organizationId,
			name: props.name,
			slug: props.slug,
			logoUrl: props.logoUrl || null,
			settings: {},
			createdAt: now,
			updatedAt: null,
			deletedAt: null,
		})

		return { organizationId, slug: props.slug }
	},
	mutationFn: (
		props: {
			name: string
			slug: string
			logoUrl?: string | null
		},
		_params,
	) =>
		Effect.gen(function* () {
			// Backend will create org in WorkOS and return real WorkOS ID
			const client = yield* HazelRpcClient
			const result = yield* client("organization.create", {
				name: props.name,
				slug: props.slug,
				logoUrl: props.logoUrl ?? null,
				settings: null,
			})

			// Wait for the organization collection to sync
			yield* Effect.promise(() => organizationCollection.utils.awaitTxId(result.transactionId))

			return {
				transactionId: result.transactionId,
				organizationId: result.data.id,
				slug: result.data.slug,
			}
		}),
	runtime: runtime,
})

export const toggleReactionEffect = createEffectOptimisticAction({
	onMutate: (props: { messageId: MessageId; emoji: string; userId: UserId }) => {
		// Check if reaction already exists in the collection
		const reactionsMap = messageReactionCollection.state
		const existingReaction = Array.from(reactionsMap.values()).find(
			(r) => r.messageId === props.messageId && r.userId === props.userId && r.emoji === props.emoji,
		)

		if (existingReaction) {
			// Toggle off: delete the existing reaction
			messageReactionCollection.delete(existingReaction.id)
			return { wasCreated: false, reactionId: existingReaction.id }
		}

		// Toggle on: insert a new reaction
		const reactionId = MessageReactionId.make(crypto.randomUUID())
		messageReactionCollection.insert({
			id: reactionId,
			messageId: props.messageId,
			userId: props.userId,
			emoji: props.emoji,
			createdAt: new Date(),
		})

		return { wasCreated: true, reactionId }
	},
	mutationFn: (props: { messageId: MessageId; emoji: string; userId: UserId }, _params) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			// Call the toggle RPC endpoint
			const result = yield* client("messageReaction.toggle", {
				messageId: props.messageId,
				emoji: props.emoji,
			})

			// Wait for the transaction to sync
			yield* Effect.promise(() => messageReactionCollection.utils.awaitTxId(result.transactionId))

			return result
		}),
	runtime: runtime,
})
