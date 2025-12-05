import { createHash, timingSafeEqual } from "node:crypto"
import { HttpApiBuilder } from "@effect/platform"
import type { MessageEmbed as DbMessageEmbed } from "@hazel/db"
import { InternalServerError, withSystemActor } from "@hazel/domain"
import {
	InvalidWebhookTokenError,
	WebhookDisabledError,
	WebhookMessageResponse,
	WebhookNotFoundError,
} from "@hazel/domain/http"
import type { MessageEmbed } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { HazelApi } from "../api"
import { ChannelWebhookRepo } from "../repositories/channel-webhook-repo"
import { MessageRepo } from "../repositories/message-repo"

// Convert domain embed schema to database embed format
const convertEmbedToDb = (embed: MessageEmbed.MessageEmbed): DbMessageEmbed => ({
	title: embed.title,
	description: embed.description,
	url: embed.url,
	color: embed.color,
	author: embed.author
		? {
				name: embed.author.name,
				url: embed.author.url,
				iconUrl: embed.author.iconUrl,
			}
		: undefined,
	footer: embed.footer
		? {
				text: embed.footer.text,
				iconUrl: embed.footer.iconUrl,
			}
		: undefined,
	image: embed.image,
	thumbnail: embed.thumbnail,
	fields: embed.fields?.map((f: MessageEmbed.MessageEmbedField) => ({
		name: f.name,
		value: f.value,
		inline: f.inline,
	})),
	timestamp: embed.timestamp,
})

export const HttpIncomingWebhookLive = HttpApiBuilder.group(HazelApi, "incoming-webhooks", (handlers) =>
	handlers.handle("execute", ({ path, payload }) =>
		Effect.gen(function* () {
			const { webhookId, token } = path
			const webhookRepo = yield* ChannelWebhookRepo
			const messageRepo = yield* MessageRepo

			// Hash the provided token
			const tokenHash = createHash("sha256").update(token).digest("hex")

			// Find webhook by ID
			const webhookOption = yield* webhookRepo.findById(webhookId).pipe(withSystemActor)

			if (Option.isNone(webhookOption)) {
				yield* Effect.logWarning("Webhook not found", { webhookId })
				return yield* Effect.fail(new WebhookNotFoundError({ message: "Webhook not found" }))
			}

			const webhook = webhookOption.value

			// Verify token hash matches using timing-safe comparison to prevent timing attacks
			const tokenBuffer = Buffer.from(tokenHash, "hex")
			const expectedBuffer = Buffer.from(webhook.tokenHash, "hex")
			if (
				tokenBuffer.length !== expectedBuffer.length ||
				!timingSafeEqual(tokenBuffer, expectedBuffer)
			) {
				yield* Effect.logWarning("Invalid webhook token", { webhookId })
				return yield* Effect.fail(new InvalidWebhookTokenError({ message: "Invalid webhook token" }))
			}

			// Check if webhook is enabled
			if (!webhook.isEnabled) {
				yield* Effect.logWarning("Webhook is disabled", { webhookId: webhook.id })
				return yield* Effect.fail(new WebhookDisabledError({ message: "Webhook is disabled" }))
			}

			// Validate payload has content or embeds
			if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
				return yield* Effect.fail(
					new InternalServerError({
						message: "Message must have content or embeds",
						detail: "Provide either 'content' or 'embeds' in the payload",
					}),
				)
			}

			// Limit number of embeds (like Discord)
			if (payload.embeds && payload.embeds.length > 10) {
				return yield* Effect.fail(
					new InternalServerError({
						message: "Too many embeds",
						detail: "Maximum 10 embeds per message",
					}),
				)
			}

			// Convert embeds to database format
			const dbEmbeds = payload.embeds?.map(convertEmbedToDb) ?? null

			// Create message as the webhook's bot user
			const [message] = yield* messageRepo
				.insert({
					channelId: webhook.channelId,
					authorId: webhook.botUserId,
					content: payload.content ?? "",
					embeds: dbEmbeds,
					replyToMessageId: null,
					threadChannelId: null,
					deletedAt: null,
				})
				.pipe(withSystemActor)

			// Update last used timestamp (fire and forget)
			yield* webhookRepo.updateLastUsed(webhook.id).pipe(withSystemActor, Effect.ignore)

			return new WebhookMessageResponse({
				messageId: message.id,
				channelId: webhook.channelId,
			})
		}).pipe(
			Effect.catchTags({
				DatabaseError: (error: unknown) =>
					Effect.fail(
						new InternalServerError({
							message: "Database error while creating message",
							detail: String(error),
						}),
					),
				ParseError: (error: unknown) =>
					Effect.fail(
						new InternalServerError({
							message: "Invalid request data",
							detail: String(error),
						}),
					),
			}),
		),
	),
)
