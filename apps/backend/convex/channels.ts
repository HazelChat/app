import { v } from "convex/values"
import { asyncMap } from "convex-helpers"
import type { Id } from "./_generated/dataModel"
import { userMutation, userQuery } from "./middleware/withUser"

export const getChannels = userQuery({
	args: {
		serverId: v.id("servers"),
		favoriteFilter: v.optional(v.object({ favorite: v.boolean() })),
	},
	handler: async (ctx, args) => {
		const channels = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) => q.eq("serverId", args.serverId))
			.filter((q) => q.neq(q.field("type"), "thread"))
			.collect()

		const channelsWithMembers = await asyncMap(channels, async (channel) => {
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channel._id))
				.collect()

			const currentUser = channelMembers.find((member) => member.userId === ctx.user.id)

			if (!currentUser) return null

			const members = await asyncMap(channelMembers, async (member) => {
				const user = await ctx.db.get(member.userId)

				if (!user) return null

				return {
					...member,
					user,
				}
			})

			return {
				...channel,
				members: members.filter((member) => member !== null),
				isMuted: currentUser?.isMuted || false,
				isHidden: currentUser?.isHidden || false,
				isFavorite: currentUser?.isFavorite || false,
				currentUser,
			}
		})

		const filteredChannels = channelsWithMembers
			.filter((channel) => channel !== null)
			.filter((channel) =>
				args.favoriteFilter
					? args.favoriteFilter.favorite
						? channel.currentUser?.isFavorite
						: !channel.currentUser?.isFavorite
					: true,
			)

		const dmChannels = filteredChannels.filter(
			(channel) => channel.type !== "private" && channel.type !== "public",
		)
		const serverChannels = filteredChannels.filter(
			(channel) => channel.type === "private" || channel.type === "public",
		)

		return {
			dmChannels,
			serverChannels,
		}
	},
})

export const getChannel = userQuery({
	args: {
		channelId: v.id("channels"),
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const channel = await ctx.db.get(args.channelId)

		if (!channel) throw new Error("Channel not found")

		const channelMembers = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", args.channelId))
			.collect()

		const currentUser = channelMembers.find((member) => member.userId === ctx.user.id)

		if (!currentUser) {
			throw new Error("You are not a member of this channel")
		}

		const members = await asyncMap(channelMembers, async (member) => {
			const user = await ctx.db.get(member.userId)

			if (!user) return null

			return {
				...member,
				user,
			}
		})

		const channelWithMembers = {
			...channel,
			members: members.filter((member) => member !== null),
			isMuted: currentUser?.isMuted || false,
			isHidden: currentUser?.isHidden || false,
			currentUser,
		}

		return channelWithMembers
	},
})

export const getPublicChannels = userQuery({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const publicChannels = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) => q.eq("serverId", args.serverId))
			.filter((q) => q.eq(q.field("type"), "public"))
			.collect()

		return publicChannels
	},
})

export const getUnjoinedPublicChannels = userQuery({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const publicChannels = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) => q.eq("serverId", args.serverId))
			.filter((q) => q.eq(q.field("type"), "public"))
			.collect()

		const channelsWithMembers = await asyncMap(publicChannels, async (channel) => {
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) =>
					q.eq("channelId", channel._id).eq("userId", ctx.user.id),
				)
				.first()

			if (!channelMembers) return channel

			return null
		})

		return channelsWithMembers.filter((channel) => channel !== null)
	},
})

export const createChannel = userMutation({
	args: {
		serverId: v.id("servers"),

		name: v.string(),
		type: v.union(v.literal("public"), v.literal("private"), v.literal("thread"), v.literal("direct")),
		userIds: v.optional(v.array(v.id("users"))),
		parentChannelId: v.optional(v.id("channels")),

		threadMessageId: v.optional(v.id("messages")),
	},
	handler: async (ctx, args) => {
		const channelId = await ctx.db.insert("channels", {
			name: args.name,
			serverId: args.serverId,
			type: args.type,
			parentChannelId: args.parentChannelId,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		await ctx.db.insert("channelMembers", {
			channelId,
			userId: ctx.user.id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		if (args.userIds) {
			// TODO: Validate that user can add userIds to channel?
			await asyncMap(args.userIds, async (userId) => {
				await ctx.db.insert("channelMembers", {
					channelId,
					userId: userId,
					joinedAt: Date.now(),
					isHidden: false,
					isMuted: false,
					isFavorite: false,
					notificationCount: 0,
				})
			})
		}

		if (args.type === "thread") {
			if (!args.threadMessageId) throw new Error("Thread message id is required")

			await ctx.db.patch(args.threadMessageId, {
				threadChannelId: channelId,
			})
		}

		return channelId
	},
})

function createParticipantHash(userIds: Id<"users">[]) {
	return userIds.sort().join(":")
}

export const creatDmChannel = userMutation({
	args: {
		serverId: v.id("servers"),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const participantHash = createParticipantHash([args.userId, ctx.user.id])

		const existingChannel = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) =>
				q.eq("serverId", args.serverId).eq("participantHash", participantHash),
			)
			.first()

		if (existingChannel) {
			return existingChannel._id
		}

		const channelId = await ctx.db.insert("channels", {
			serverId: args.serverId,
			name: "Direct Message",
			type: "single",
			participantHash,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		await Promise.all([
			ctx.db.insert("channelMembers", {
				channelId,
				userId: ctx.user.id,
				joinedAt: Date.now(),
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				notificationCount: 0,
			}),
			ctx.db.insert("channelMembers", {
				channelId,
				userId: args.userId,
				joinedAt: Date.now(),
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				notificationCount: 0,
			}),
		])

		return channelId
	},
})

export const leaveChannel = userMutation({
	args: {
		serverId: v.id("servers"),
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", args.channelId).eq("userId", ctx.user.id),
			)
			.first()

		if (!channelMember) throw new Error("You are not a member of this channel")

		await ctx.db.delete(channelMember._id)
	},
})

export const joinChannel = userMutation({
	args: {
		serverId: v.id("servers"),
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", args.channelId).eq("userId", ctx.user.id),
			)
			.first()

		if (channelMember) throw new Error("You are already a member of this channel")

		await ctx.db.insert("channelMembers", {
			userId: ctx.user.id,
			channelId: args.channelId,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})
	},
})

export const updateChannelPreferences = userMutation({
	args: {
		serverId: v.id("servers"),
		channelId: v.id("channels"),
		isMuted: v.optional(v.boolean()),
		isHidden: v.optional(v.boolean()),
		isFavorite: v.optional(v.boolean()),
	},
	handler: async (ctx, { serverId, channelId, ...args }) => {
		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channelId).eq("userId", ctx.user.id))
			.first()

		if (!channelMember) throw new Error("You are not a member of this channel")

		await ctx.db.patch(channelMember._id, args)
	},
})
