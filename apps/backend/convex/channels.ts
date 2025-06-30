import type { Id as IdType } from "@hazel/backend"
import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { ConfectMutationCtx, ConfectQueryCtx } from "./confect"
import { userMutation, userQuery } from "./middleware/withUserEffect"
import { confectSchema } from "./schema"

export const getChannels = userQuery({
	args: Schema.Struct({
		favoriteFilter: Schema.optional(Schema.Struct({ favorite: Schema.Boolean })),
	}),
	returns: Schema.Struct({
		dmChannels: Schema.Array(confectSchema.tableSchemas.channels.withSystemFields),
		serverChannels: Schema.Array(confectSchema.tableSchemas.channels.withSystemFields),
	}),
	handler: Effect.fn(function* ({ favoriteFilter, userData, serverId }) {
		const ctx = yield* ConfectQueryCtx

		const channels = yield* ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) => q.eq("serverId", serverId))
			.filter((q) => q.neq(q.field("type"), "thread"))
			.collect()

		const channelsWithMembers = yield* Effect.forEach(
			channels,
			Effect.fn(function* (channel) {
				const channelMembers = yield* ctx.db
					.query("channelMembers")
					.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channel._id))
					.collect()

				const currentUser = channelMembers.find((member) => member.userId === userData.user._id)

				if (!currentUser) return null

				const membersWithUsers = yield* Effect.forEach(
					channelMembers,
					Effect.fn(function* (member) {
						const userOption = yield* ctx.db.get(member.userId)

						if (Option.isNone(userOption)) return null

						return {
							...member,
							user: userOption.value,
						}
					}),
				)

				return {
					...channel,
					members: membersWithUsers.filter((member) => member !== null),
					isMuted: currentUser?.isMuted || false,
					isHidden: currentUser?.isHidden || false,
					isFavorite: currentUser?.isFavorite || false,
					currentUser,
				}
			}),
		)

		const filteredChannels = channelsWithMembers
			.filter((channel) => channel !== null)
			.filter((channel) =>
				favoriteFilter
					? favoriteFilter.favorite
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
	}),
})

export const getChannel = userQuery({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: confectSchema.tableSchemas.channels.withSystemFields,
	handler: Effect.fn(function* ({ channelId, userData, serverId }) {
		const ctx = yield* ConfectQueryCtx

		const channelOption = yield* ctx.db.get(channelId)

		if (Option.isNone(channelOption)) {
			return yield* Effect.fail(new Error("Channel not found"))
		}

		const channel = channelOption.value

		const channelMembers = yield* ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", channelId))
			.collect()

		const currentUser = channelMembers.find((member) => member.userId === userData.user._id)

		if (!currentUser) {
			return yield* Effect.fail(new Error("You are not a member of this channel"))
		}

		const membersWithUsers = yield* Effect.forEach(
			channelMembers,
			Effect.fn(function* (member) {
				const userOption = yield* ctx.db.get(member.userId)

				if (Option.isNone(userOption)) return null

				return {
					...member,
					user: userOption.value,
				}
			}),
		)

		const channelWithMembers = {
			...channel,
			members: membersWithUsers.filter((member) => member !== null),
			isMuted: currentUser?.isMuted || false,
			isHidden: currentUser?.isHidden || false,
			currentUser,
		}

		return channelWithMembers
	}),
})

export const getPublicChannels = userQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(confectSchema.tableSchemas.channels.withSystemFields),
	handler: Effect.fn(function* ({ serverId }) {
		const ctx = yield* ConfectQueryCtx

		const publicChannels = yield* ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) => q.eq("serverId", serverId))
			.filter((q) => q.eq(q.field("type"), "public"))
			.collect()

		return publicChannels
	}),
})

export const getUnjoinedPublicChannels = userQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(confectSchema.tableSchemas.channels.withSystemFields),
	handler: Effect.fn(function* ({ serverId, userData }) {
		const ctx = yield* ConfectQueryCtx

		const publicChannels = yield* ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) => q.eq("serverId", serverId))
			.filter((q) => q.eq(q.field("type"), "public"))
			.collect()

		const channelsWithMembers = yield* Effect.forEach(
			publicChannels,
			Effect.fn(function* (channel) {
				const channelMemberOption = yield* ctx.db
					.query("channelMembers")
					.withIndex("by_channelIdAndUserId", (q) =>
						q.eq("channelId", channel._id).eq("userId", userData.user._id),
					)
					.first()

				if (Option.isNone(channelMemberOption)) return channel

				return null
			}),
		)

		return channelsWithMembers.filter((channel) => channel !== null)
	}),
})

export const createChannel = userMutation({
	args: Schema.Struct({
		name: Schema.String,
		type: Schema.Union(
			Schema.Literal("public"),
			Schema.Literal("private"),
			Schema.Literal("thread"),
			Schema.Literal("direct"),
		),
		userIds: Schema.optional(Schema.Array(Id.Id("users"))),
		parentChannelId: Schema.optional(Id.Id("channels")),
		threadMessageId: Schema.optional(Id.Id("messages")),
	}),
	returns: Id.Id("channels"),
	handler: Effect.fn(function* ({
		name,
		type,
		userIds,
		parentChannelId,
		threadMessageId,
		userData,
		serverId,
	}) {
		const ctx = yield* ConfectMutationCtx

		const channelId = yield* ctx.db.insert("channels", {
			name,
			serverId,
			type,
			parentChannelId,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		yield* ctx.db.insert("channelMembers", {
			channelId,
			userId: userData.user._id,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		if (userIds) {
			// TODO: Validate that user can add userIds to channel?
			yield* Effect.forEach(
				userIds,
				Effect.fn(function* (userId) {
					yield* ctx.db.insert("channelMembers", {
						channelId,
						userId,
						joinedAt: Date.now(),
						isHidden: false,
						isMuted: false,
						isFavorite: false,
						notificationCount: 0,
					})
				}),
			)
		}

		if (type === "thread") {
			if (!threadMessageId) {
				return yield* Effect.fail(new Error("Thread message id is required"))
			}

			yield* ctx.db.patch(threadMessageId, {
				threadChannelId: channelId,
			})
		}

		return channelId
	}),
})

function createParticipantHash(userIds: IdType<"users">[]) {
	return userIds.sort().join(":")
}

export const creatDmChannel = userMutation({
	args: Schema.Struct({
		userId: Id.Id("users"),
	}),
	returns: Id.Id("channels"),
	handler: Effect.fn(function* ({ userId, userData, serverId }) {
		const ctx = yield* ConfectMutationCtx

		const participantHash = createParticipantHash([userId, userData.user._id])

		const existingChannelOption = yield* ctx.db
			.query("channels")
			.withIndex("by_serverId_and_participantHash", (q) =>
				q.eq("serverId", serverId).eq("participantHash", participantHash),
			)
			.first()

		if (Option.isSome(existingChannelOption)) {
			return existingChannelOption.value._id
		}

		const channelId = yield* ctx.db.insert("channels", {
			serverId,
			name: "Direct Message",
			type: "single",
			participantHash,
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		yield* Effect.all([
			ctx.db.insert("channelMembers", {
				channelId,
				userId: userData.user._id,
				joinedAt: Date.now(),
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				notificationCount: 0,
			}),
			ctx.db.insert("channelMembers", {
				channelId,
				userId,
				joinedAt: Date.now(),
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				notificationCount: 0,
			}),
		])

		return channelId
	}),
})

export const leaveChannel = userMutation({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ channelId, userData }) {
		const ctx = yield* ConfectMutationCtx

		const channelMemberOption = yield* ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", channelId).eq("userId", userData.user._id),
			)
			.first()

		if (Option.isNone(channelMemberOption)) {
			return yield* Effect.fail(new Error("You are not a member of this channel"))
		}

		yield* ctx.db.delete(channelMemberOption.value._id)

		return null
	}),
})

export const joinChannel = userMutation({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ channelId, userData }) {
		const ctx = yield* ConfectMutationCtx

		const channelMemberOption = yield* ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", channelId).eq("userId", userData.user._id),
			)
			.first()

		if (Option.isSome(channelMemberOption)) {
			return yield* Effect.fail(new Error("You are already a member of this channel"))
		}

		yield* ctx.db.insert("channelMembers", {
			userId: userData.user._id,
			channelId,
			joinedAt: Date.now(),
			isHidden: false,
			isMuted: false,
			isFavorite: false,
			notificationCount: 0,
		})

		return null
	}),
})

export const updateChannelPreferences = userMutation({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
		isMuted: Schema.optional(Schema.Boolean),
		isHidden: Schema.optional(Schema.Boolean),
		isFavorite: Schema.optional(Schema.Boolean),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ channelId, isMuted, isHidden, isFavorite, userData }) {
		const ctx = yield* ConfectMutationCtx

		const channelMemberOption = yield* ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) =>
				q.eq("channelId", channelId).eq("userId", userData.user._id),
			)
			.first()

		if (Option.isNone(channelMemberOption)) {
			return yield* Effect.fail(new Error("You are not a member of this channel"))
		}

		const updateData: Record<string, any> = {}
		if (isMuted !== undefined) updateData.isMuted = isMuted
		if (isHidden !== undefined) updateData.isHidden = isHidden
		if (isFavorite !== undefined) updateData.isFavorite = isFavorite

		yield* ctx.db.patch(channelMemberOption.value._id, updateData)

		return null
	}),
})
