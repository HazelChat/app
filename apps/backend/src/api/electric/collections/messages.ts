import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { Message } from "@hazel/db/models"
import { MessageId } from "@hazel/db/schema"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../../lib/schema"
import { ChannelNotFoundError } from "../../../rpc/groups/channels"

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
	.middleware(CurrentUser.Authorization) {}
