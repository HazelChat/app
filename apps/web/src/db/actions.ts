import { optimisticAction } from "@hazel/effect-electric-db-collection"
import {
	type AttachmentId,
	ChannelId,
	ChannelMemberId,
	MessageId,
	MessageReactionId,
	OrganizationId,
	type UserId,
} from "@hazel/schema"
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

export const sendMessageAction = optimisticAction({
	collections: [messageCollection],
	runtime: runtime,

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
			embeds: null,
			createdAt: new Date(),
			updatedAt: null,
			deletedAt: null,
		})

		return { messageId }
	},

	mutate: (props, _ctx) =>
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
				embeds: null,
				deletedAt: null,
				authorId: props.authorId,
			})

			// No manual sync needed - automatic sync on messageCollection!
			return { data: result, transactionId: result.transactionId }
		}),
})

export const createChannelAction = optimisticAction({
	collections: {
		channel: channelCollection,
		members: channelMemberCollection,
	},
	runtime: runtime,
	onMutate: (props: {
		organizationId: OrganizationId
		name: string
		type: "public" | "private"
		parentChannelId: ChannelId | null
		currentUserId: UserId
	}) => {
		const channelId = ChannelId.make(crypto.randomUUID())
		const now = new Date()

		// Optimistically insert the channel
		channelCollection.insert({
			id: channelId,
			name: props.name,
			type: props.type,
			organizationId: props.organizationId,
			parentChannelId: props.parentChannelId,
			createdAt: now,
			updatedAt: null,
			deletedAt: null,
		})

		// Add creator as member
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

		return { channelId }
	},

	mutate: (props, ctx) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient
			const result = yield* client("channel.create", {
				id: ctx.mutateResult.channelId,
				name: props.name,
				type: props.type,
				organizationId: props.organizationId,
				parentChannelId: props.parentChannelId,
			})
			return { data: { channelId: result.data.id }, transactionId: result.transactionId }
		}),
})

export const createDmChannelAction = optimisticAction({
	collections: {
		channel: channelCollection,
		members: channelMemberCollection,
	},
	runtime: runtime,

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

	mutate: (props, _ctx) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			const result = yield* client("channel.createDm", {
				organizationId: props.organizationId,
				participantIds: props.participantIds,
				type: props.type,
				name: props.name,
			})

			// No manual sync needed - automatic sync on BOTH channel AND members collections!
			return {
				data: { channelId: result.data.id },
				transactionId: result.transactionId,
			}
		}),
})

export const createOrganizationAction = optimisticAction({
	collections: [organizationCollection],
	runtime: runtime,

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

	mutate: (props, _ctx) =>
		Effect.gen(function* () {
			// Backend will create org in WorkOS and return real WorkOS ID
			const client = yield* HazelRpcClient
			const result = yield* client("organization.create", {
				name: props.name,
				slug: props.slug,
				logoUrl: props.logoUrl ?? null,
				settings: null,
			})

			// No manual sync needed - automatic sync on organizationCollection!
			return {
				data: {
					organizationId: result.data.id,
					slug: result.data.slug,
				},
				transactionId: result.transactionId,
			}
		}),
})

export const toggleReactionAction = optimisticAction({
	collections: [messageReactionCollection],
	runtime: runtime,

	onMutate: (props: { messageId: MessageId; channelId: ChannelId; emoji: string; userId: UserId }) => {
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
			channelId: props.channelId,
			userId: props.userId,
			emoji: props.emoji,
			createdAt: new Date(),
		})

		return { wasCreated: true, reactionId }
	},

	mutate: (props, _ctx) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			// Call the toggle RPC endpoint
			const result = yield* client("messageReaction.toggle", {
				messageId: props.messageId,
				channelId: props.channelId,
				emoji: props.emoji,
			})

			// No manual sync needed - automatic sync on messageReactionCollection!
			return { data: result, transactionId: result.transactionId }
		}),
})
