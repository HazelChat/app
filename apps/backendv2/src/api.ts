import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { Channel, Message } from "@hazel/db/models"
import { Schema } from "effect"

import { Authorization } from "./lib/auth"
import { InternalServerError, UnauthorizedError } from "./lib/errors"
import { TransactionId } from "./lib/schema"

export class RootGroup extends HttpApiGroup.make("root").add(
	HttpApiEndpoint.get("root")`/`.addSuccess(Schema.String),
) {}

export class CreateMessageResponse extends Schema.Class<CreateMessageResponse>("CreateMessageResponse")({
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

export class CreateChannelResponse extends Schema.Class<CreateChannelResponse>("CreateChannelResponse")({
	data: Channel.Model.json,
	transactionId: TransactionId,
}) {}

export class ChannelGroup extends HttpApiGroup.make("channels")
	.add(
		HttpApiEndpoint.post("create")`/`
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
	.prefix("/channels")
	.middleware(Authorization) {}

export class MessageGroup extends HttpApiGroup.make("messages")
	.add(
		HttpApiEndpoint.post("create")`/`
			.setPayload(Message.Model.jsonCreate)
			.addSuccess(CreateMessageResponse)
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
	.prefix("/messages")
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

export class GenerateMockDataRequest extends Schema.Class<GenerateMockDataRequest>("GenerateMockDataRequest")({
	organizationId: Schema.UUID,
	userCount: Schema.Number,
	channelCount: Schema.Number,
	messageCount: Schema.Number,
}) {}

export class GenerateMockDataResponse extends Schema.Class<GenerateMockDataResponse>("GenerateMockDataResponse")({
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

export class HazelApi extends HttpApi.make("HazelApp")
	.add(ChannelGroup)
	.add(MessageGroup)
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
