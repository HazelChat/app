import { defineSchema, defineTable, Id } from "@rjdellecese/confect/server"
import { Schema } from "effect"

export const confectSchema = defineSchema({
	organizations: defineTable(
		Schema.Struct({
			workosId: Schema.String,
			name: Schema.String,
			slug: Schema.String,
			logoUrl: Schema.optional(Schema.String),
			settings: Schema.optional(
				Schema.Struct({
					allowInvites: Schema.optional(Schema.Boolean),
					defaultUserRole: Schema.optional(
						Schema.Union(Schema.Literal("member"), Schema.Literal("admin")),
					),
				}),
			),
			deletedAt: Schema.optional(Schema.Number),
		}),
	)
		.index("by_workosId", ["workosId"])
		.index("by_slug", ["slug"]),
	organizationMembers: defineTable(
		Schema.Struct({
			organizationId: Id.Id("organizations"),
			userId: Id.Id("users"),
			role: Schema.String,
			joinedAt: Schema.Number,
			invitedBy: Schema.optional(Id.Id("users")),
			deletedAt: Schema.optional(Schema.Number),
		}),
	)
		.index("by_organizationId", ["organizationId"])
		.index("by_userId", ["userId"])
		.index("by_organizationId_userId", ["organizationId", "userId"]),
	invitations: defineTable(
		Schema.Struct({
			workosInvitationId: Schema.String,
			organizationId: Id.Id("organizations"),
			email: Schema.String,
			invitedBy: Schema.optional(Id.Id("users")),
			invitedAt: Schema.Number,
			expiresAt: Schema.Number,
			status: Schema.Union(
				Schema.Literal("pending"),
				Schema.Literal("accepted"),
				Schema.Literal("expired"),
				Schema.Literal("revoked"),
			),
			acceptedAt: Schema.optional(Schema.Number),
			acceptedBy: Schema.optional(Id.Id("users")),
		}),
	)
		.index("by_workosInvitationId", ["workosInvitationId"])
		.index("by_organizationId", ["organizationId"])
		.index("by_email", ["email"])
		.index("by_status", ["status"]),
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
			organizationId: Id.Id("organizations"),
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
	).index("by_organizationId_and_participantHash", ["organizationId", "participantHash"]),
	messages: defineTable(
		Schema.Struct({
			attachedFiles: Schema.Array(Id.Id("attachments")),
			authorId: Id.Id("users"),
			channelId: Id.Id("channels"),
			replyToMessageId: Schema.optional(Id.Id("messages")),
			threadChannelId: Schema.optional(Id.Id("channels")),

			content: Schema.String,
			reactions: Schema.Array(
				Schema.Struct({
					userId: Id.Id("users"),
					emoji: Schema.String,
				}),
			),
			updatedAt: Schema.optional(Schema.Number),
			deletedAt: Schema.optional(Schema.Number),
		}),
	).index("by_channelId", ["channelId"]),
	users: defineTable(
		Schema.Struct({
			externalId: Schema.String,
			firstName: Schema.String,
			email: Schema.String,
			lastName: Schema.String,
			avatarUrl: Schema.String,
			lastSeen: Schema.Number,
			settings: Schema.optional(Schema.Struct({})),
			status: Schema.Union(Schema.Literal("online"), Schema.Literal("offline"), Schema.Literal("away")),

			deletedAt: Schema.optional(Schema.Number),
		}),
	).index("by_externalId", ["externalId"]),
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
			memberId: Id.Id("organizationMembers"),
			targetedResourceId: Schema.optional(Schema.Union(Id.Id("channels"), Id.Id("organizations"))),
			resourceId: Schema.optional(Schema.Union(Id.Id("messages"))),
		}),
	).index("by_memberId_targetedResourceId", ["memberId", "targetedResourceId"]),
	typingIndicators: defineTable(
		Schema.Struct({
			channelId: Id.Id("channels"),
			memberId: Id.Id("organizationMembers"),
			lastTyped: Schema.Number,
		}),
	)
		.index("by_memberId", ["channelId", "memberId"])
		.index("by_channel_timestamp", ["channelId", "lastTyped"])
		.index("by_timestamp", ["lastTyped"]),
	attachments: defineTable(
		Schema.Struct({
			organizationId: Id.Id("organizations"),
			channelId: Schema.optional(Id.Id("channels")),
			messageId: Schema.optional(Id.Id("messages")),
			fileName: Schema.String,
			r2Key: Schema.String,
			uploadedBy: Id.Id("users"),
			uploadedAt: Schema.Number,
			status: Schema.Union(
				Schema.Literal("uploading"),
				Schema.Literal("complete"),
				Schema.Literal("failed"),
			),
			deletedAt: Schema.optional(Schema.Number),
		}),
	)
		.index("by_messageId", ["messageId"])
		.index("by_channelId", ["channelId"])
		.index("by_organizationId", ["organizationId"])
		.index("by_uploadedBy", ["uploadedBy"])
		.index("by_status", ["status"]),
})

export default confectSchema.convexSchemaDefinition
