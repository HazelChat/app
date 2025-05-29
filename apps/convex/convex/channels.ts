import { v } from "convex/values"
import { userMutation, userQuery } from "./middleware/withUser"

import { asyncMap } from "convex-helpers"

export const getChannels = userQuery({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const channels = await ctx.db
			.query("channels")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.filter((q) => q.neq(q.field("type"), "thread"))
			.collect()

		const channelsWithMembers = await asyncMap(channels, async (channel) => {
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channel._id))
				.collect()

			const currentUser = channelMembers.find((member) => member.userId === ctx.user.id)

			if (!currentUser) return null

			return {
				...channel,
				members: channelMembers,
				isMuted: currentUser?.isMuted || false,
				isHidden: currentUser?.isHidden || false,
				currentUser,
			}
		})

		const filteredChannels = channelsWithMembers.filter((channel) => channel !== null)

		const dmChannels = filteredChannels.filter((channel) => channel.type !== "private" && channel.type !== "public")
		const serverChannels = filteredChannels.filter(
			(channel) => channel.type === "private" || channel.type === "public",
		)

		return {
			dmChannels,
			serverChannels,
		}
	},
})

export const createChannel = userMutation({
	args: {
		serverId: v.id("servers"),

		name: v.string(),
		type: v.union(
			v.literal("public"),
			v.literal("private"),
			v.literal("thread"),
			v.literal("direct"),
			v.literal("single"),
		),
		userIds: v.optional(v.array(v.id("users"))),
		parentChannelId: v.optional(v.id("channels")),
	},
	handler: async (ctx, args) => {
		const channelId = await ctx.db.insert("channels", {
			name: args.name,
			serverId: args.serverId,
			type: args.type,
			parentChannelId: args.parentChannelId,
			updatedAt: Date.now(),
		})

		await ctx.db.insert("channelMembers", {
			channelId,
			userId: ctx.user.id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
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
				})
			})
		}

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
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", args.channelId).eq("userId", ctx.user.id))
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
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", args.channelId).eq("userId", ctx.user.id))
			.first()

		if (channelMember) throw new Error("You are already a member of this channel")

		await ctx.db.insert("channelMembers", {
			userId: ctx.user.id,
			channelId: args.channelId,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
		})
	},
})

export const updateChannelPreferences = userMutation({
	args: {
		serverId: v.id("servers"),
		channelId: v.id("channels"),
		isMuted: v.optional(v.boolean()),
		isHidden: v.optional(v.boolean()),
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
