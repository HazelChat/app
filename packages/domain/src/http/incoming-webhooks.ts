import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { ChannelWebhookId } from "@hazel/schema"
import { Schema } from "effect"
import { InternalServerError } from "../errors"
import { MessageEmbed } from "../models/message-embed-schema"

// Incoming webhook payload (Discord-style)
export class IncomingWebhookPayload extends Schema.Class<IncomingWebhookPayload>("IncomingWebhookPayload")({
	content: Schema.optional(Schema.String), // Plain text content
	embeds: Schema.optional(Schema.Array(MessageEmbed)), // Rich embeds
}) {}

// OpenStatus Monitor schema
export const OpenStatusMonitor = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	url: Schema.String,
})
export type OpenStatusMonitor = Schema.Schema.Type<typeof OpenStatusMonitor>

// OpenStatus status type
export const OpenStatusStatus = Schema.Literal("degraded", "error", "recovered")
export type OpenStatusStatus = Schema.Schema.Type<typeof OpenStatusStatus>

// OpenStatus webhook payload
export class OpenStatusPayload extends Schema.Class<OpenStatusPayload>("OpenStatusPayload")({
	monitor: OpenStatusMonitor,
	cronTimestamp: Schema.Number,
	status: OpenStatusStatus,
	statusCode: Schema.optional(Schema.Number),
	latency: Schema.optional(Schema.Number),
	errorMessage: Schema.optional(Schema.String),
}) {}

// Response after successful webhook execution
export class WebhookMessageResponse extends Schema.Class<WebhookMessageResponse>("WebhookMessageResponse")({
	messageId: Schema.String,
	channelId: Schema.String,
}) {}

// Error: Webhook not found
export class WebhookNotFoundError extends Schema.TaggedError<WebhookNotFoundError>()(
	"WebhookNotFoundError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 404 }),
) {}

// Error: Webhook is disabled
export class WebhookDisabledError extends Schema.TaggedError<WebhookDisabledError>()(
	"WebhookDisabledError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 403 }),
) {}

// Error: Invalid webhook token
export class InvalidWebhookTokenError extends Schema.TaggedError<InvalidWebhookTokenError>()(
	"InvalidWebhookTokenError",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({ status: 401 }),
) {}

// Public endpoint - no auth middleware, uses webhook token in URL
export class IncomingWebhookGroup extends HttpApiGroup.make("incoming-webhooks")
	.add(
		HttpApiEndpoint.post("execute", `/:webhookId/:token`)
			.setPayload(IncomingWebhookPayload)
			.addSuccess(WebhookMessageResponse)
			.addError(WebhookNotFoundError)
			.addError(WebhookDisabledError)
			.addError(InvalidWebhookTokenError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					webhookId: ChannelWebhookId,
					token: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Execute Incoming Webhook",
					description:
						"Post a message to a channel via webhook. Supports plain text content and Discord-style embeds.",
					summary: "Execute webhook to create message",
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("executeOpenStatus", `/:webhookId/:token/openstatus`)
			.setPayload(OpenStatusPayload)
			.addSuccess(WebhookMessageResponse)
			.addError(WebhookNotFoundError)
			.addError(WebhookDisabledError)
			.addError(InvalidWebhookTokenError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					webhookId: ChannelWebhookId,
					token: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Execute OpenStatus Webhook",
					description:
						"Receive status alerts from OpenStatus and post them as rich embeds to a channel.",
					summary: "Process OpenStatus alert",
				}),
			),
	)
	.prefix("/webhooks/incoming") {}
