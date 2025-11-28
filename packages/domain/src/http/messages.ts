import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { InternalServerError, NotFoundError, UnauthorizedError } from "../errors"
import { AttachmentId, ChannelId, MessageId, TransactionId } from "../ids"
import { Message } from "../models"
import { CurrentUser } from "../index"

export class MessageResponse extends Schema.Class<MessageResponse>("MessageResponse")({
	data: Message.Model.json,
	transactionId: TransactionId,
}) {}

export class CreateMessageRequest extends Schema.Class<CreateMessageRequest>("CreateMessageRequest")({
	channelId: ChannelId,
	content: Schema.String,
	attachmentIds: Schema.optional(Schema.Array(AttachmentId)),
}) {}

export class UpdateMessageRequest extends Schema.Class<UpdateMessageRequest>("UpdateMessageRequest")({
	content: Schema.optional(Schema.String),
}) {}

export class MessageHttpGroup extends HttpApiGroup.make("messages")
	.add(
		HttpApiEndpoint.post("create")`/messages`
			.addSuccess(MessageResponse)
			.setPayload(CreateMessageRequest)
			.addError(InternalServerError)
			.addError(UnauthorizedError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create Message",
					description: "Send a new message to a channel",
				}),
			),
	)
	.add(
		HttpApiEndpoint.patch("update", "/messages/:id")
			.setPath(Schema.Struct({ id: MessageId }))
			.addSuccess(MessageResponse)
			.setPayload(UpdateMessageRequest)
			.addError(InternalServerError)
			.addError(UnauthorizedError)
			.addError(NotFoundError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update Message",
					description: "Update content of an existing message",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/messages/:id")
			.setPath(Schema.Struct({ id: MessageId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(InternalServerError)
			.addError(UnauthorizedError)
			.addError(NotFoundError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete Message",
					description: "Delete a message",
				}),
			),
	)
	.prefix("/v1")
	.middleware(CurrentUser.Authorization) {}
