import { defineSchema, defineTable, Id } from "@rjdellecese/confect/server"
import { v } from "convex/values"
import { Schema } from "effect"

export const confectSchema = defineSchema({
	servers: defineTable(
		Schema.Struct({
			name: Schema.String,
			imageUrl: Schema.optional(Schema.String),

			creatorId: Schema.optional(Id.Id("users")),

			updatedAt: Schema.Number,
			deletedAt: Schema.optional(Schema.Number),
		}),
	),
	channels: defineTable(
		Schema.Struct({
			name: Schema.String,
			type: Schema.Union(
				Schema.Literal("public"),
				Schema.Literal("private"),
				Schema.Literal("thread"),
				Schema.Literal("direct"),
				Schema.Literal("single"),
			),
			serverId: Id.Id("servers"),
			parentChannelId: Schema.optional(Id.Id("channels")),
			pinnedMessages: Schema.Array(
				Schema.Struct({
					messageId: Id.Id("messages"),
					pinnedAt: Schema.Number,
				}),
			),
			participantHash: Schema.optional(Schema.String),
			updatedAt: Schema.Number,
			deletedAt: Schema.optional(Schema.Number),
		}),
	).index("by_serverId_and_participantHash", ["serverId", "participantHash"]),
	users: defineTable(
		Schema.Struct({
			displayName: Schema.String,
			tag: Schema.String,
			avatarUrl: Schema.String,
			role: Schema.Union(Schema.Literal("member"), Schema.Literal("admin"), Schema.Literal("owner")),
			status: Schema.Union(Schema.Literal("online"), Schema.Literal("offline"), Schema.Literal("away")),
			accountId: Id.Id("accounts"),
			serverId: Id.Id("servers"),
			joinedAt: Schema.Number,
			lastSeen: Schema.Number,
			settings: Schema.optional(Schema.Struct({})),
			deletedAt: Schema.optional(Schema.Number),
		}),
	)
		.index("by_accountId_serverId", ["accountId", "serverId"])
		.index("by_server_id", ["serverId"]),
	messages: defineTable(
		Schema.Struct({
			attachedFiles: Schema.Array(Schema.String),
			content: Schema.String,
			authorId: Id.Id("users"),
			channelId: Id.Id("channels"),
			replyToMessageId: Schema.optional(Id.Id("messages")),
			threadChannelId: Schema.optional(Id.Id("channels")),
			reactions: Schema.Array(
				Schema.Struct({
					userId: Id.Id("users"),
					emoji: Schema.String,
				}),
			),
			updatedAt: Schema.Number,
			deletedAt: Schema.optional(Schema.Number),
		}),
	).index("by_channelId", ["channelId"]),
	accounts: defineTable(
		Schema.Struct({
			externalId: Schema.String,
			displayName: Schema.String,
			avatarUrl: Schema.String,
			tokenIdentifier: Schema.String,
			deletedAt: Schema.optional(Schema.Number),
		}),
	)
		.index("by_externalId", ["externalId"])
		.index("bg_tokenIdentifier", ["tokenIdentifier"]),
	channelMembers: defineTable(
		Schema.Struct({
			userId: Id.Id("users"),
			channelId: Id.Id("channels"),
			isHidden: Schema.Boolean,
			isMuted: Schema.Boolean,
			isFavorite: Schema.Boolean,
			lastSeenMessageId: Schema.optional(Id.Id("messages")),
			notificationCount: Schema.Number,
			joinedAt: Schema.Number,
			deletedAt: Schema.optional(Schema.Number),
		}),
	).index("by_channelIdAndUserId", ["channelId", "userId"]),
	notifications: defineTable(
		Schema.Struct({
			accountId: Id.Id("accounts"),
			targetedResourceId: Schema.optional(Schema.Union(Id.Id("channels"), Id.Id("servers"))),
			resourceId: Schema.optional(Schema.Union(Id.Id("messages"))),
		}),
	).index("by_accountId", ["accountId"]),
	typingIndicators: defineTable(
		Schema.Struct({
			channelId: Id.Id("channels"),
			accountId: Id.Id("accounts"),
			lastTyped: Schema.Number,
		}),
	)
		.index("by_accountId", ["channelId", "accountId"])
		.index("by_channel_timestamp", ["channelId", "lastTyped"])
		.index("by_timestamp", ["lastTyped"]),
	invites: defineTable(
		Schema.Struct({
			serverId: Id.Id("servers"),
			creatorId: Id.Id("users"),
			code: Schema.String,
			expiresAt: Schema.optional(Schema.Number),
			revokedAt: Schema.optional(Schema.Number),
			createdAt: Schema.Number,
		}),
	).index("by_code", ["code"]),
})

export default confectSchema.convexSchemaDefinition
