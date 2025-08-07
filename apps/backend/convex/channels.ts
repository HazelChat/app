import { v } from "convex/values"
import { asyncMap } from "convex-helpers"
import type { Id } from "./_generated/dataModel"
import { organizationServerMutation, organizationServerQuery } from "./middleware/withOrganization"
import { userMutation, userQuery } from "./middleware/withUser"

export const getChannelForOrganization = organizationServerQuery({
	args: {
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const channel = await ctx.db.get(args.channelId)
		if (!channel) throw new Error("Channel not found")
		if (channel.organizationId !== ctx.organizationId) throw new Error("Channel not in this organization")

		const user = ctx.account.doc

		// Check if user is member of channel
		const channelMembers = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channel._id))
			.collect()

		const currentUser = channelMembers.find((member) => member.userId === user._id)

		if (!currentUser && channel.type !== "public") {
			throw new Error("You are not a member of this channel")
		}

		const members = await asyncMap(channelMembers, async (member) => {
			const memberUser = await ctx.db.get(member.userId)

			if (!memberUser) return null

			return {
				...member,
				user: memberUser,
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
	},
})

export const getChannelsForOrganization = organizationServerQuery({
	args: {
		favoriteFilter: v.optional(v.object({ favorite: v.boolean() })),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc

		const channels = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", ctx.organizationId),
			)
			.filter((q) => q.neq(q.field("type"), "thread"))
			.collect()

		const channelsWithMembers = await asyncMap(channels, async (channel) => {
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channel._id))
				.collect()

			const currentUser = channelMembers.find((member) => member.userId === user._id)

			if (!currentUser) return null

			const members = await asyncMap(channelMembers, async (member) => {
				const memberUser = await ctx.db.get(member.userId)

				if (!memberUser) return null

				return {
					...member,
					user: memberUser,
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
			.filter((channel) => !channel.isHidden)
			.filter((channel) => {
				if (args.favoriteFilter?.favorite !== undefined) {
					return channel.isFavorite === args.favoriteFilter.favorite
				}
				return true
			})

		const dmChannels = filteredChannels.filter(
			(channel) => channel.type !== "private" && channel.type !== "public",
		)
		const organizationChannels = filteredChannels.filter(
			(channel) => channel.type === "private" || channel.type === "public",
		)

		return {
			dmChannels,
			organizationChannels,
		}
	},
})

export const list = organizationServerQuery({
	args: {},
	handler: async (ctx, _args) => {
		const user = ctx.account.doc

		const channels = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", ctx.organizationId),
			)
			.filter((q) => q.neq(q.field("type"), "thread"))
			.collect()

		const channelsWithMembers = await asyncMap(channels, async (channel) => {
			const channelMembers = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channel._id))
				.collect()

			const currentUser = channelMembers.find((member) => member.userId === user._id)

			if (!currentUser) return null

			const members = await asyncMap(channelMembers, async (member) => {
				const memberUser = await ctx.db.get(member.userId)

				if (!memberUser) return null

				return {
					...member,
					user: memberUser,
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

		const filteredChannels = channelsWithMembers.filter((channel) => channel !== null)

		return filteredChannels
	},
})

export const getChannels = userQuery({
	args: {
		favoriteFilter: v.optional(v.object({ favorite: v.boolean() })),
	},
	handler: async (ctx, args) => {
		const channels = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", args.organizationId),
			)
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
		const organizationChannels = filteredChannels.filter(
			(channel) => channel.type === "private" || channel.type === "public",
		)

		return {
			dmChannels,
			organizationChannels,
		}
	},
})

export const getChannel = userQuery({
	args: {
		channelId: v.id("channels"),
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
	args: {},
	handler: async (ctx, args) => {
		const publicChannels = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", args.organizationId),
			)
			.filter((q) => q.eq(q.field("type"), "public"))
			.collect()

		return publicChannels
	},
})

export const getUnjoinedPublicChannelsForOrganization = organizationServerQuery({
	args: {},
	handler: async (ctx) => {
		const user = ctx.account.doc

		const channels = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", ctx.organizationId),
			)
			.filter((q) => q.eq(q.field("type"), "public"))
			.collect()

		const unjoinedChannels = await asyncMap(channels, async (channel) => {
			const channelMember = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) =>
					q.eq("channelId", channel._id).eq("userId", user._id),
				)
				.first()

			if (channelMember) return null

			return channel
		})

		return unjoinedChannels.filter((channel) => channel !== null)
	},
})

export const getUnjoinedPublicChannels = userQuery({
	args: {},
	handler: async (ctx, args) => {
		const publicChannels = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", args.organizationId),
			)
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

export const createChannelForOrganization = organizationServerMutation({
	args: {
		name: v.string(),
		type: v.union(v.literal("public"), v.literal("private")),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc

		const channelId = await ctx.db.insert("channels", {
			name: args.name,
			organizationId: ctx.organizationId,
			type: args.type,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		// Add creator as member
		await ctx.db.insert("channelMembers", {
			channelId,
			userId: user._id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		return channelId
	},
})

export const createChannel = userMutation({
	args: {
		name: v.string(),
		type: v.union(v.literal("public"), v.literal("private"), v.literal("thread"), v.literal("direct")),
		userIds: v.optional(v.array(v.id("users"))),
		parentChannelId: v.optional(v.id("channels")),

		threadMessageId: v.optional(v.id("messages")),
	},
	handler: async (ctx, args) => {
		const channelId = await ctx.db.insert("channels", {
			name: args.name,
			organizationId: args.organizationId,
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

export const createDmChannel = organizationServerMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc

		const participantHash = createParticipantHash([user._id, args.userId])

		const existingChannel = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", ctx.organizationId).eq("participantHash", participantHash),
			)
			.collect()

		if (existingChannel.length > 0) {
			// Check if the current user has the channel hidden
			const currentUserMember = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) =>
					q.eq("channelId", existingChannel[0]._id).eq("userId", user._id),
				)
				.first()

			// If the channel is hidden for the user, unhide it
			if (currentUserMember?.isHidden) {
				await ctx.db.patch(currentUserMember._id, {
					isHidden: false,
				})
			}

			return existingChannel[0]._id
		}

		const channelId = await ctx.db.insert("channels", {
			organizationId: ctx.organizationId,
			name: "Direct Message",
			type: "single",
			participantHash,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		// Add both users as members
		await ctx.db.insert("channelMembers", {
			channelId,
			userId: user._id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		await ctx.db.insert("channelMembers", {
			channelId,
			userId: args.userId,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		return channelId
	},
})

export const createGroupDmChannel = organizationServerMutation({
	args: {
		userIds: v.array(v.id("users")),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc
		
		// Include current user in the participant list
		const allUserIds = [...args.userIds, user._id]
		const uniqueUserIds = [...new Set(allUserIds)]
		
		// Validate we have at least 2 users (including current user)
		if (uniqueUserIds.length < 2) {
			throw new Error("Group DM requires at least 2 participants")
		}
		
		const participantHash = createParticipantHash(uniqueUserIds)
		
		// Check if a channel with these participants already exists
		const existingChannel = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", ctx.organizationId).eq("participantHash", participantHash),
			)
			.first()
		
		if (existingChannel) {
			// Check if the current user has the channel hidden
			const currentUserMember = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) =>
					q.eq("channelId", existingChannel._id).eq("userId", user._id),
				)
				.first()
			
			// If the channel is hidden for the user, unhide it
			if (currentUserMember?.isHidden) {
				await ctx.db.patch(currentUserMember._id, {
					isHidden: false,
				})
			}
			
			return existingChannel._id
		}
		
		// Get user details for channel name
		const users = await asyncMap(args.userIds, async (userId) => {
			return await ctx.db.get(userId)
		})
		
		// Create a name from the first few users
		const channelName = users
			.filter(u => u !== null)
			.slice(0, 3)
			.map(u => `${u.firstName} ${u.lastName}`)
			.join(", ") + (users.length > 3 ? ` +${users.length - 3}` : "")
		
		// Create the channel
		const channelId = await ctx.db.insert("channels", {
			organizationId: ctx.organizationId,
			name: channelName,
			type: uniqueUserIds.length === 2 ? "single" : "direct",
			participantHash,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})
		
		// Add all users as members
		await asyncMap(uniqueUserIds, async (userId) => {
			await ctx.db.insert("channelMembers", {
				channelId,
				userId,
				joinedAt: Date.now(),
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				notificationCount: 0,
			})
		})
		
		return channelId
	},
})

export const creatDmChannel = userMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const participantHash = createParticipantHash([args.userId, ctx.user.id])

		const existingChannel = await ctx.db
			.query("channels")
			.withIndex("by_organizationId_and_participantHash", (q) =>
				q.eq("organizationId", args.organizationId).eq("participantHash", participantHash),
			)
			.first()

		if (existingChannel) {
			// Check if the current user has the channel hidden
			const currentUserMember = await ctx.db
				.query("channelMembers")
				.withIndex("by_channelIdAndUserId", (q) =>
					q.eq("channelId", existingChannel._id).eq("userId", ctx.user.id),
				)
				.first()

			// If the channel is hidden for the user, unhide it
			if (currentUserMember?.isHidden) {
				await ctx.db.patch(currentUserMember._id, {
					isHidden: false,
				})
			}

			return existingChannel._id
		}

		const channelId = await ctx.db.insert("channels", {
			organizationId: args.organizationId,
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

export const leaveChannelForOrganization = organizationServerMutation({
	args: {
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc

		const channel = await ctx.db.get(args.channelId)
		if (!channel) throw new Error("Channel not found")
		if (channel.organizationId !== ctx.organizationId) throw new Error("Channel not in this organization")

		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", args.channelId).eq("userId", user._id),
			)
			.first()

		if (!channelMember) {
			throw new Error("You are not a member of this channel")
		}

		await ctx.db.delete(channelMember._id)
	},
})

export const leaveChannel = userMutation({
	args: {
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

export const joinChannelForOrganization = organizationServerMutation({
	args: {
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc

		const channel = await ctx.db.get(args.channelId)
		if (!channel) throw new Error("Channel not found")
		if (channel.organizationId !== ctx.organizationId) throw new Error("Channel not in this organization")

		const existingMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", args.channelId).eq("userId", user._id),
			)
			.first()

		if (existingMember) {
			throw new Error("Already a member of this channel")
		}

		await ctx.db.insert("channelMembers", {
			channelId: args.channelId,
			userId: user._id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})
	},
})

export const joinChannel = userMutation({
	args: {
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", args.channelId).eq("userId", ctx.user.id),
			)
			.first()

		if (channelMember) {
			throw new Error("You are already a member of this channel")
		}

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

export const updateChannelPreferencesForOrganization = organizationServerMutation({
	args: {
		channelId: v.id("channels"),
		isMuted: v.optional(v.boolean()),
		isHidden: v.optional(v.boolean()),
		isFavorite: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = ctx.account.doc

		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", args.channelId).eq("userId", user._id),
			)
			.first()

		if (!channelMember) {
			throw new Error("You are not a member of this channel")
		}

		await ctx.db.patch(channelMember._id, {
			isMuted: args.isMuted ?? channelMember.isMuted,
			isHidden: args.isHidden ?? channelMember.isHidden,
			isFavorite: args.isFavorite ?? channelMember.isFavorite,
		})
	},
})

export const updateChannelPreferences = userMutation({
	args: {
		channelId: v.id("channels"),
		isMuted: v.optional(v.boolean()),
		isHidden: v.optional(v.boolean()),
		isFavorite: v.optional(v.boolean()),
	},
	handler: async (ctx, { channelId, ...args }) => {
		const channelMember = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channelId).eq("userId", ctx.user.id))
			.first()

		if (!channelMember) throw new Error("You are not a member of this channel")

		await ctx.db.patch(channelMember._id, args)
	},
})
