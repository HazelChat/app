import { Schema } from "effect"
import { ChannelId, ChannelMemberId, MessageId, NotificationId, OrganizationMemberId, UserId } from "@hazel/schema"

// Channel member with notification preferences
export const ChannelMemberForNotification = Schema.Struct({
	id: ChannelMemberId,
	channelId: ChannelId,
	userId: UserId,
	isMuted: Schema.Boolean,
	notificationCount: Schema.Number,
})

export type ChannelMemberForNotification = typeof ChannelMemberForNotification.Type

// Result of getting channel members who should be notified
export const GetChannelMembersResult = Schema.Struct({
	members: Schema.Array(ChannelMemberForNotification),
	totalCount: Schema.Number,
})

export type GetChannelMembersResult = typeof GetChannelMembersResult.Type

// Result of creating a single notification
export const CreateNotificationResult = Schema.Struct({
	notificationId: NotificationId,
	memberId: OrganizationMemberId,
	createdAt: Schema.DateTimeUtc,
})

export type CreateNotificationResult = typeof CreateNotificationResult.Type

// Batch notification creation result
export const CreateNotificationsResult = Schema.Struct({
	notificationIds: Schema.Array(NotificationId),
	notifiedCount: Schema.Number,
})

export type CreateNotificationsResult = typeof CreateNotificationsResult.Type

// Error types for message activities
export class GetChannelMembersError extends Schema.TaggedError<GetChannelMembersError>()(
	"GetChannelMembersError",
	{
		channelId: ChannelId,
		message: Schema.String,
		cause: Schema.Unknown.pipe(Schema.optional),
	},
) {}

export class CreateNotificationError extends Schema.TaggedError<CreateNotificationError>()(
	"CreateNotificationError",
	{
		messageId: MessageId,
		memberId: OrganizationMemberId,
		message: Schema.String,
		cause: Schema.Unknown.pipe(Schema.optional),
	},
) {}
