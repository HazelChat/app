import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, Multipart, OpenApi } from "@effect/platform"
import {
	Attachment,
	Channel,
	ChannelMember,
	DirectMessageParticipant,
	Invitation,
	Message,
	MessageReaction,
	Notification,
	Organization,
	OrganizationMember,
	PinnedMessage,
	TypingIndicator,
	User,
} from "@hazel/db/models"
import {
	AttachmentId,
	ChannelId,
	ChannelMemberId,
	DirectMessageParticipantId,
	InvitationId,
	MessageId,
	MessageReactionId,
	NotificationId,
	OrganizationId,
	OrganizationMemberId,
	PinnedMessageId,
	TypingIndicatorId,
	UserId,
} from "@hazel/db/schema"
import { Schema } from "effect"
import { Authorization } from "./lib/auth"
import { InternalServerError, UnauthorizedError } from "./lib/errors"
import { TransactionId } from "./lib/schema"

export class RootGroup extends HttpApiGroup.make("root").add(
	HttpApiEndpoint.get("root")`/`.addSuccess(Schema.String),
) {}

export class MessageResponse extends Schema.Class<MessageResponse>("MessageResponse")({
	data: Message.Model.json,
	transactionId: TransactionId,
}) {}

export class MessageNotFoundError extends Schema.TaggedError<MessageNotFoundError>("MessageNotFoundError")(
	"MessageNotFoundError",
	{
		messageId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class ChannelNotFoundError extends Schema.TaggedError<ChannelNotFoundError>("ChannelNotFoundError")(
	"MessageNotFoundError",
	{
		channelId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class ChannelMemberNotFoundError extends Schema.TaggedError<ChannelMemberNotFoundError>(
	"ChannelMemberNotFoundError",
)(
	"ChannelMemberNotFoundError",
	{
		channelMemberId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class OrganizationNotFoundError extends Schema.TaggedError<OrganizationNotFoundError>(
	"OrganizationNotFoundError",
)(
	"OrganizationNotFoundError",
	{
		organizationId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class InvitationNotFoundError extends Schema.TaggedError<InvitationNotFoundError>(
	"InvitationNotFoundError",
)(
	"InvitationNotFoundError",
	{
		invitationId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class MessageReactionNotFoundError extends Schema.TaggedError<MessageReactionNotFoundError>(
	"MessageReactionNotFoundError",
)(
	"MessageReactionNotFoundError",
	{
		messageReactionId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class PinnedMessageNotFoundError extends Schema.TaggedError<PinnedMessageNotFoundError>(
	"PinnedMessageNotFoundError",
)(
	"PinnedMessageNotFoundError",
	{
		pinnedMessageId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class NotificationNotFoundError extends Schema.TaggedError<NotificationNotFoundError>(
	"NotificationNotFoundError",
)(
	"NotificationNotFoundError",
	{
		notificationId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>("UserNotFoundError")(
	"UserNotFoundError",
	{
		userId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class OrganizationMemberNotFoundError extends Schema.TaggedError<OrganizationMemberNotFoundError>(
	"OrganizationMemberNotFoundError",
)(
	"OrganizationMemberNotFoundError",
	{
		organizationMemberId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class AttachmentNotFoundError extends Schema.TaggedError<AttachmentNotFoundError>(
	"AttachmentNotFoundError",
)(
	"AttachmentNotFoundError",
	{
		attachmentId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class DirectMessageParticipantNotFoundError extends Schema.TaggedError<DirectMessageParticipantNotFoundError>(
	"DirectMessageParticipantNotFoundError",
)(
	"DirectMessageParticipantNotFoundError",
	{
		directMessageParticipantId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
	}),
) {}

export class OrganizationResponse extends Schema.Class<OrganizationResponse>("OrganizationResponse")({
	data: Organization.Model.json,
	transactionId: TransactionId,
}) {}

export class InvitationResponse extends Schema.Class<InvitationResponse>("InvitationResponse")({
	data: Invitation.Model.json,
	transactionId: TransactionId,
}) {}

export class MessageReactionResponse extends Schema.Class<MessageReactionResponse>("MessageReactionResponse")(
	{
		data: MessageReaction.Model.json,
		transactionId: TransactionId,
	},
) {}

export class PinnedMessageResponse extends Schema.Class<PinnedMessageResponse>("PinnedMessageResponse")({
	data: PinnedMessage.Model.json,
	transactionId: TransactionId,
}) {}

export class NotificationResponse extends Schema.Class<NotificationResponse>("NotificationResponse")({
	data: Notification.Model.json,
	transactionId: TransactionId,
}) {}

export class UserResponse extends Schema.Class<UserResponse>("UserResponse")({
	data: User.Model.json,
	transactionId: TransactionId,
}) {}

export class OrganizationMemberResponse extends Schema.Class<OrganizationMemberResponse>(
	"OrganizationMemberResponse",
)({
	data: OrganizationMember.Model.json,
	transactionId: TransactionId,
}) {}

export class AttachmentResponse extends Schema.Class<AttachmentResponse>("AttachmentResponse")({
	data: Attachment.Model.json,
	transactionId: TransactionId,
}) {}

export class DirectMessageParticipantResponse extends Schema.Class<DirectMessageParticipantResponse>(
	"DirectMessageParticipantResponse",
)({
	data: DirectMessageParticipant.Model.json,
	transactionId: TransactionId,
}) {}

export class CreateChannelResponse extends Schema.Class<CreateChannelResponse>("CreateChannelResponse")({
	data: Channel.Model.json,
	transactionId: TransactionId,
}) {}

export class ChannelMemberResponse extends Schema.Class<ChannelMemberResponse>("ChannelMemberResponse")({
	data: ChannelMember.Model.json,
	transactionId: TransactionId,
}) {}

export class ChannelGroup extends HttpApiGroup.make("channels")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(Channel.Model.jsonCreate)
			.addSuccess(CreateChannelResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Channel",
					description: "Create a new channel in an organization",
					summary: "Create a new channel",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: ChannelId }))
			.setPayload(Channel.Model.jsonUpdate)
			.addSuccess(CreateChannelResponse)
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Channel",
					description: "Update an existing channel",
					summary: "Update a channel",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: ChannelId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Channel",
					description: "Delete an existing channel",
					summary: "Delete a channel",
				}),
			),
	)
	.prefix("/channels")
	.middleware(Authorization) {}

export class MessageGroup extends HttpApiGroup.make("messages")
	.add(
		HttpApiEndpoint.post("create", "/")
			.setPayload(Message.Insert)
			.addSuccess(MessageResponse)
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Message",
					description: "Create a new message in a channel",
					summary: "Create a new message",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: MessageId }))
			.setPayload(Message.Model.jsonUpdate)
			.addSuccess(MessageResponse)
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Message",
					description: "Update an existing message in a channel",
					summary: "Update a message",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: MessageId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Message",
					description: "Delete an existing message in a channel",
					summary: "Delete a message",
				}),
			),
	)
	.prefix("/messages")
	.middleware(Authorization) {}

export class ChannelMemberGroup extends HttpApiGroup.make("channelMembers")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(ChannelMember.Model.jsonCreate)
			.addSuccess(ChannelMemberResponse)
			.addError(ChannelNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Channel Member",
					description: "Add a user to a channel",
					summary: "Create a channel member",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: ChannelMemberId }))
			.setPayload(ChannelMember.Model.jsonUpdate)
			.addSuccess(ChannelMemberResponse)
			.addError(ChannelMemberNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Channel Member",
					description: "Update channel member preferences and settings",
					summary: "Update a channel member",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: ChannelMemberId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(ChannelMemberNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Channel Member",
					description: "Remove a user from a channel",
					summary: "Remove a channel member",
				}),
			),
	)
	.prefix("/channel-members")
	.middleware(Authorization) {}

export class OrganizationGroup extends HttpApiGroup.make("organizations")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(Organization.Model.jsonCreate)
			.addSuccess(OrganizationResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Organization",
					description: "Create a new organization",
					summary: "Create a new organization",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: OrganizationId }))
			.setPayload(Organization.Model.jsonUpdate)
			.addSuccess(OrganizationResponse)
			.addError(OrganizationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Organization",
					description: "Update an existing organization",
					summary: "Update an organization",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: OrganizationId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(OrganizationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Organization",
					description: "Delete an existing organization",
					summary: "Delete an organization",
				}),
			),
	)
	.prefix("/organizations")
	.middleware(Authorization) {}

export class InvitationGroup extends HttpApiGroup.make("invitations")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(Invitation.Model.jsonCreate)
			.addSuccess(InvitationResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Invitation",
					description: "Create a new invitation",
					summary: "Create a new invitation",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: InvitationId }))
			.setPayload(Invitation.Model.jsonUpdate)
			.addSuccess(InvitationResponse)
			.addError(InvitationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Invitation",
					description: "Update an existing invitation",
					summary: "Update an invitation",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: InvitationId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(InvitationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Invitation",
					description: "Delete an existing invitation",
					summary: "Delete an invitation",
				}),
			),
	)
	.prefix("/invitations")
	.middleware(Authorization) {}

export class MessageReactionGroup extends HttpApiGroup.make("messageReactions")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(MessageReaction.Model.jsonCreate)
			.addSuccess(MessageReactionResponse)
			.addError(MessageNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Message Reaction",
					description: "Add a reaction to a message",
					summary: "Create a message reaction",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: MessageReactionId }))
			.setPayload(MessageReaction.Model.jsonUpdate)
			.addSuccess(MessageReactionResponse)
			.addError(MessageReactionNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Message Reaction",
					description: "Update an existing message reaction",
					summary: "Update a message reaction",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: MessageReactionId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(MessageReactionNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Message Reaction",
					description: "Remove a reaction from a message",
					summary: "Delete a message reaction",
				}),
			),
	)
	.prefix("/message-reactions")
	.middleware(Authorization) {}

export class PinnedMessageGroup extends HttpApiGroup.make("pinnedMessages")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(PinnedMessage.Model.jsonCreate)
			.addSuccess(PinnedMessageResponse)
			.addError(MessageNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Pinned Message",
					description: "Pin a message in a channel",
					summary: "Create a pinned message",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: PinnedMessageId }))
			.setPayload(PinnedMessage.Model.jsonUpdate)
			.addSuccess(PinnedMessageResponse)
			.addError(PinnedMessageNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Pinned Message",
					description: "Update an existing pinned message",
					summary: "Update a pinned message",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: PinnedMessageId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(PinnedMessageNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Pinned Message",
					description: "Unpin a message from a channel",
					summary: "Delete a pinned message",
				}),
			),
	)
	.prefix("/pinned-messages")
	.middleware(Authorization) {}

export class NotificationGroup extends HttpApiGroup.make("notifications")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(Notification.Model.jsonCreate)
			.addSuccess(NotificationResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Notification",
					description: "Create a new notification",
					summary: "Create a notification",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: NotificationId }))
			.setPayload(Notification.Model.jsonUpdate)
			.addSuccess(NotificationResponse)
			.addError(NotificationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Notification",
					description: "Update an existing notification",
					summary: "Update a notification",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: NotificationId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(NotificationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Notification",
					description: "Delete an existing notification",
					summary: "Delete a notification",
				}),
			),
	)
	.prefix("/notifications")
	.middleware(Authorization) {}

export class UserGroup extends HttpApiGroup.make("users")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(User.Model.jsonCreate)
			.addSuccess(UserResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create User",
					description: "Create a new user",
					summary: "Create a user",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: UserId }))
			.setPayload(User.Model.jsonUpdate)
			.addSuccess(UserResponse)
			.addError(UserNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update User",
					description: "Update an existing user",
					summary: "Update a user",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: UserId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(UserNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete User",
					description: "Delete an existing user",
					summary: "Delete a user",
				}),
			),
	)
	.prefix("/users")
	.middleware(Authorization) {}

export class OrganizationMemberGroup extends HttpApiGroup.make("organizationMembers")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(OrganizationMember.Model.jsonCreate)
			.addSuccess(OrganizationMemberResponse)
			.addError(OrganizationNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Organization Member",
					description: "Add a user to an organization",
					summary: "Create an organization member",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: OrganizationMemberId }))
			.setPayload(OrganizationMember.Model.jsonUpdate)
			.addSuccess(OrganizationMemberResponse)
			.addError(OrganizationMemberNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Organization Member",
					description: "Update organization member role and settings",
					summary: "Update an organization member",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: OrganizationMemberId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(OrganizationMemberNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Organization Member",
					description: "Remove a user from an organization",
					summary: "Remove an organization member",
				}),
			),
	)
	.prefix("/organization-members")
	.middleware(Authorization) {}

export class AttachmentGroup extends HttpApiGroup.make("attachments")
	.add(
		HttpApiEndpoint.post("upload", "/upload")
			.setPayload(
				HttpApiSchema.Multipart(
					Schema.Struct({
						file: Multipart.SingleFileSchema,
						organizationId: OrganizationId,
						channelId: ChannelId,
					}),
				),
			)
			.addSuccess(AttachmentResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError),
	)
	// .add(
	// 	HttpApiEndpoint.post("create", `/`)
	// 		.setPayload(Attachment.Model.jsonCreate)
	// 		.addSuccess(AttachmentResponse)
	// 		.addError(UnauthorizedError)
	// 		.addError(InternalServerError)
	// 		.annotateContext(
	// 			OpenApi.annotations({
	// 				title: "Create Attachment",
	// 				description: "Create a new attachment",
	// 				summary: "Create an attachment",
	// 			}),
	// 		),
	// )

	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: AttachmentId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(AttachmentNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Attachment",
					description: "Delete an existing attachment",
					summary: "Delete an attachment",
				}),
			),
	)
	.prefix("/attachments")
	.middleware(Authorization) {}

export class DirectMessageParticipantGroup extends HttpApiGroup.make("directMessageParticipants")
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(DirectMessageParticipant.Model.jsonCreate)
			.addSuccess(DirectMessageParticipantResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Direct Message Participant",
					description: "Add a participant to a direct message",
					summary: "Create a direct message participant",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: DirectMessageParticipantId }))
			.setPayload(DirectMessageParticipant.Model.jsonUpdate)
			.addSuccess(DirectMessageParticipantResponse)
			.addError(DirectMessageParticipantNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Direct Message Participant",
					description: "Update direct message participant settings",
					summary: "Update a direct message participant",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: DirectMessageParticipantId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(DirectMessageParticipantNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Direct Message Participant",
					description: "Remove a participant from a direct message",
					summary: "Remove a direct message participant",
				}),
			),
	)
	.prefix("/direct-message-participants")
	.middleware(Authorization) {}

// WorkOS Webhook Types
export class WorkOSWebhookPayload extends Schema.Class<WorkOSWebhookPayload>("WorkOSWebhookPayload")({
	event: Schema.String,
	data: Schema.Unknown,
	id: Schema.String,
	created_at: Schema.String,
}) {}

export class WebhookResponse extends Schema.Class<WebhookResponse>("WebhookResponse")({
	success: Schema.Boolean,
	message: Schema.optional(Schema.String),
}) {}

export class InvalidWebhookSignature extends Schema.TaggedError<InvalidWebhookSignature>(
	"InvalidWebhookSignature",
)(
	"InvalidWebhookSignature",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 401,
	}),
) {}

export class WebhookGroup extends HttpApiGroup.make("webhooks")
	.add(
		HttpApiEndpoint.post("workos")`/workos`
			.setPayload(Schema.Unknown) // Raw payload for signature verification
			.addSuccess(WebhookResponse)
			.addError(InvalidWebhookSignature)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "WorkOS Webhook",
					description: "Receive and process WorkOS webhook events",
					summary: "Process WorkOS webhook events",
				}),
			),
	)
	.prefix("/webhooks") {}

export class GenerateMockDataRequest extends Schema.Class<GenerateMockDataRequest>("GenerateMockDataRequest")(
	{
		organizationId: Schema.UUID,
		userCount: Schema.Number,
		channelCount: Schema.Number,
		messageCount: Schema.Number,
	},
) {}

export class GenerateMockDataResponse extends Schema.Class<GenerateMockDataResponse>(
	"GenerateMockDataResponse",
)({
	transactionId: TransactionId,
	created: Schema.Struct({
		users: Schema.Number,
		channels: Schema.Number,
		messages: Schema.Number,
		organizationMembers: Schema.Number,
	}),
}) {}

export class MockDataGroup extends HttpApiGroup.make("mockData")
	.add(
		HttpApiEndpoint.post("generate")`/generate`
			.setPayload(GenerateMockDataRequest)
			.addSuccess(GenerateMockDataResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Generate Mock Data",
					description: "Generate mock data for an organization",
					summary: "Generate test data",
				}),
			),
	)
	.prefix("/mock-data")
	.middleware(Authorization) {}

export class TypingIndicatorResponse extends Schema.Class<TypingIndicatorResponse>("TypingIndicatorResponse")({
	data: TypingIndicator.Model.json,
	transactionId: TransactionId,
}) {}

export class TypingIndicatorNotFoundError extends Schema.TaggedError<TypingIndicatorNotFoundError>(
	"TypingIndicatorNotFoundError",
)(
	"TypingIndicatorNotFoundError",
	{
		typingIndicatorId: Schema.UUID,
	},
	HttpApiSchema.annotations({
		status: 404,
		description: "The typing indicator was not found",
	}),
) {}

export class TypingIndicatorGroup extends HttpApiGroup.make("typingIndicators")
	.add(
		HttpApiEndpoint.post("create")`/`
			.setPayload(TypingIndicator.Model.json)
			.addSuccess(TypingIndicatorResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Typing Indicator",
					description: "Record that a user is typing in a channel",
					summary: "Start typing",
				}),
			),
	)
	.add(
		HttpApiEndpoint.patch("update")`/{id}`
			.setPayload(TypingIndicator.Model.json)
			.setPath(Schema.Struct({ id: TypingIndicatorId }))
			.addSuccess(TypingIndicatorResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.addError(TypingIndicatorNotFoundError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Typing Indicator",
					description: "Update the typing indicator timestamp",
					summary: "Update typing",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete")`/{id}`
			.setPath(Schema.Struct({ id: TypingIndicatorId }))
			.addSuccess(TypingIndicatorResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.addError(TypingIndicatorNotFoundError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Typing Indicator",
					description: "Remove typing indicator when user stops typing",
					summary: "Stop typing",
				}),
			),
	)
	.prefix("/typing-indicators")
	.middleware(Authorization) {}

export class HazelApi extends HttpApi.make("HazelApp")
	.add(ChannelGroup)
	.add(ChannelMemberGroup)
	.add(MessageGroup)
	.add(OrganizationGroup)
	.add(InvitationGroup)
	.add(MessageReactionGroup)
	.add(PinnedMessageGroup)
	.add(NotificationGroup)
	.add(UserGroup)
	.add(OrganizationMemberGroup)
	.add(AttachmentGroup)
	.add(DirectMessageParticipantGroup)
	.add(TypingIndicatorGroup)
	.add(RootGroup)
	.add(WebhookGroup)
	.add(MockDataGroup)
	.annotateContext(
		OpenApi.annotations({
			title: "Hazel Chat API",
			description: "API for the Hazel chat application",
			version: "1.0.0",
		}),
	) {}
