import { optimisticAction } from "@hazel/effect-electric-db-collection"
import {
	type AttachmentId,
	type ChannelIcon,
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
	userCollection,
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
		icon?: string | null
		type: "public" | "private" | "thread"
		parentChannelId: ChannelId | null
		currentUserId: UserId
	}) => {
		const channelId = ChannelId.make(crypto.randomUUID())
		const now = new Date()

		// Optimistically insert the channel
		channelCollection.insert({
			id: channelId,
			name: props.name,
			icon: (props.icon || null) as ChannelIcon | null,
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
				icon: (props.icon || null) as ChannelIcon | null,
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
			icon: null,
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

export const createThreadAction = optimisticAction({
	collections: {
		channel: channelCollection,
		members: channelMemberCollection,
		messages: messageCollection,
	},
	runtime: runtime,

	onMutate: (props: {
		messageId: MessageId
		parentChannelId: ChannelId
		organizationId: OrganizationId
		currentUserId: UserId
	}) => {
		const threadChannelId = ChannelId.make(crypto.randomUUID())
		const now = new Date()

		// Create thread channel
		channelCollection.insert({
			id: threadChannelId,
			name: "Thread",
			icon: null,
			type: "thread",
			organizationId: props.organizationId,
			parentChannelId: props.parentChannelId,
			createdAt: now,
			updatedAt: null,
			deletedAt: null,
		})

		// Add creator as member
		channelMemberCollection.insert({
			id: ChannelMemberId.make(crypto.randomUUID()),
			channelId: threadChannelId,
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

		// Link original message to thread
		messageCollection.update(props.messageId, (message) => {
			message.threadChannelId = threadChannelId
		})

		return { threadChannelId }
	},

	mutate: (props, ctx) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			// Create thread channel
			const channelResult = yield* client("channel.create", {
				id: ctx.mutateResult.threadChannelId,
				name: "Thread",
				icon: null,
				type: "thread",
				organizationId: props.organizationId,
				parentChannelId: props.parentChannelId,
			})

			// Note: The message update (setting threadChannelId) is handled by
			// messageCollection.update() in onMutate, which triggers the collection's
			// onUpdate callback to sync with the backend automatically.

			return {
				data: { threadChannelId: channelResult.data.id },
				transactionId: channelResult.transactionId,
			}
		}),
})

export const updateUserAction = optimisticAction({
	collections: [userCollection],
	runtime: runtime,

	onMutate: (props: { userId: UserId; firstName?: string; lastName?: string; avatarUrl?: string }) => {
		userCollection.update(props.userId, (draft) => {
			if (props.firstName !== undefined) draft.firstName = props.firstName
			if (props.lastName !== undefined) draft.lastName = props.lastName
			if (props.avatarUrl !== undefined) draft.avatarUrl = props.avatarUrl
		})

		return { userId: props.userId }
	},

	mutate: (props, _ctx) =>
		Effect.gen(function* () {
			const client = yield* HazelRpcClient

			console.log("Updating user:", props)

			const result = yield* client("user.update", {
				id: props.userId,
				...(props.firstName !== undefined && { firstName: props.firstName }),
				...(props.lastName !== undefined && { lastName: props.lastName }),
				...(props.avatarUrl !== undefined && { avatarUrl: props.avatarUrl }),
			})

			return result
		}),
})
