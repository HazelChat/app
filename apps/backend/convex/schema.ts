import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	servers: defineTable({
		name: v.string(),
		imageUrl: v.optional(v.string()),

		// This value is always set, but it needs to be optional because the server is created before the user is created
		// (this is the way to do circular references in Convex)
		creatorId: v.optional(v.id("users")),

		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}),
	channels: defineTable({
		name: v.string(),
		type: v.union(
			v.literal("public"),
			v.literal("private"),
			v.literal("thread"),
			v.literal("direct"),
			v.literal("single"),
		),

		serverId: v.id("servers"),
		parentChannelId: v.optional(v.id("channels")),

		pinnedMessages: v.array(v.object({ messageId: v.id("messages"), pinnedAt: v.number() })),

		// This is a hash based on all participant ids in the channel (should be Single an Direct only)
		participantHash: v.optional(v.string()),

		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}).index("by_serverId_and_participantHash", ["serverId", "participantHash"]),
	users: defineTable({
		displayName: v.string(),
		tag: v.string(),
		avatarUrl: v.string(),

		role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
		status: v.union(v.literal("online"), v.literal("offline"), v.literal("away")),

		accountId: v.id("accounts"),
		serverId: v.id("servers"),

		joinedAt: v.number(),
		lastSeen: v.number(),
		deletedAt: v.optional(v.number()),
	})
		.index("by_accountId_serverId", ["accountId", "serverId"])
		.index("by_server_id", ["serverId"]),
	messages: defineTable({
		attachedFiles: v.array(
			v.object({
				key: v.string(),
				fileName: v.string(),
			}),
		),
		content: v.string(),

		authorId: v.id("users"),
		channelId: v.id("channels"),

		replyToMessageId: v.optional(v.id("messages")),
		threadChannelId: v.optional(v.id("channels")),

		reactions: v.array(
			v.object({
				userId: v.id("users"),
				emoji: v.string(),
			}),
		),

		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}).index("by_channelId", ["channelId"]),
	accounts: defineTable({
		externalId: v.string(),
		displayName: v.string(),
		avatarUrl: v.string(),

		tokenIdentifier: v.string(),

		deletedAt: v.optional(v.number()),
	})
		.index("by_externalId", ["externalId"])
		.index("bg_tokenIdentifier", ["tokenIdentifier"]),
	channelMembers: defineTable({
		userId: v.id("users"),
		channelId: v.id("channels"),

		isHidden: v.boolean(),
		isMuted: v.boolean(),

		lastSeenMessageId: v.optional(v.id("messages")),
		notificationCount: v.number(),

		joinedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}).index("by_channelIdAndUserId", ["channelId", "userId"]),
	notifications: defineTable({
		accountId: v.id("accounts"),
		targetedResourceId: v.optional(v.union(v.id("channels"), v.id("servers"))),
		resourceId: v.optional(v.union(v.id("messages"))),
	}).index("by_accountId", ["accountId"]),

	old_presence: defineTable({
		user: v.string(),
		room: v.string(),
		present: v.boolean(),
		latestJoin: v.number(),
		data: v.any(),
	})
		.index("room_present_join", ["room", "present", "latestJoin"])
		.index("room_user", ["room", "user"]),

	old_presence_heartbeats: defineTable({
		user: v.string(),
		room: v.string(),
		markAsGone: v.id("_scheduled_functions"),
	}).index("by_room_user", ["room", "user"]),
})
