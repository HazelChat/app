import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	servers: defineTable({
		name: v.string(),
		slug: v.string(),
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

		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}).index("by_serverId", ["serverId"]),
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
	}).index("by_accountId", ["accountId"]),
	messages: defineTable({
		attachedFiles: v.array(v.string()),
		content: v.string(),

		authorId: v.id("users"),
		channelId: v.id("channels"),

		replyToMessageId: v.optional(v.id("messages")),
		threadChannelId: v.optional(v.id("channels")),

		updatedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}),
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

		joinedAt: v.number(),
		deletedAt: v.optional(v.number()),
	}).index("by_channelIdAndUserId", ["channelId", "userId"]),
	pinnedMessages: defineTable({
		messageId: v.id("messages"),
		channelId: v.id("channels"),
	}),
	reactions: defineTable({
		messageId: v.id("messages"),
		userId: v.id("users"),
		emoji: v.string(),
	}),
})
