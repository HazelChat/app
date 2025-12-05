import { createHash, randomBytes } from "node:crypto"
import { Database } from "@hazel/db"
import { type ChannelWebhookId, CurrentUser, policyUse, withRemapDbErrors, withSystemActor } from "@hazel/domain"
import {
	ChannelNotFoundError,
	ChannelWebhookCreatedResponse,
	ChannelWebhookListResponse,
	ChannelWebhookNotFoundError,
	ChannelWebhookResponse,
	ChannelWebhookRpcs,
} from "@hazel/domain/rpc"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { ChannelWebhookPolicy } from "../../policies/channel-webhook-policy"
import { ChannelRepo } from "../../repositories/channel-repo"
import { ChannelWebhookRepo } from "../../repositories/channel-webhook-repo"
import { WebhookBotService } from "../../services/webhook-bot-service"

// Generate a secure token and return both the plain token and its hash
const generateToken = () => {
	const token = randomBytes(32).toString("hex")
	const tokenHash = createHash("sha256").update(token).digest("hex")
	const tokenSuffix = token.slice(-4)
	return { token, tokenHash, tokenSuffix }
}

// Build the webhook URL
const buildWebhookUrl = (webhookId: string, token: string) => {
	const baseUrl = process.env.API_BASE_URL ?? "http://localhost:3010"
	return `${baseUrl}/webhooks/incoming/${webhookId}/${token}`
}

/**
 * Channel Webhook RPC Handlers
 *
 * Implements the business logic for all channel webhook-related RPC methods.
 * Only organization admins can manage webhooks.
 */
export const ChannelWebhookRpcLive = ChannelWebhookRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"channelWebhook.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context
							const channelRepo = yield* ChannelRepo
							const webhookRepo = yield* ChannelWebhookRepo
							const botService = yield* WebhookBotService

							// Get channel to get organization ID
							const channelOption = yield* channelRepo
								.findById(payload.channelId)
								.pipe(withSystemActor)
							if (Option.isNone(channelOption)) {
								return yield* Effect.fail(
									new ChannelNotFoundError({ channelId: payload.channelId }),
								)
							}
							const channel = channelOption.value

							// Generate token
							const { token, tokenHash, tokenSuffix } = generateToken()

							// Generate a stable ID for the bot's external ID reference
							const botReferenceId = crypto.randomUUID() as ChannelWebhookId

							// Create bot user for this webhook
							const botUser = yield* botService.createWebhookBot(
								botReferenceId,
								payload.name,
								payload.avatarUrl ?? null,
								channel.organizationId,
							)

							// Create webhook
							const [webhook] = yield* webhookRepo
								.insert({
									channelId: payload.channelId,
									organizationId: channel.organizationId,
									botUserId: botUser.id,
									name: payload.name,
									description: payload.description ?? null,
									avatarUrl: payload.avatarUrl ?? null,
									tokenHash,
									tokenSuffix,
									isEnabled: true,
									createdBy: user.id,
									lastUsedAt: null,
									deletedAt: null,
								})
								.pipe(withSystemActor)

							const txid = yield* generateTransactionId()

							return new ChannelWebhookCreatedResponse({
								data: webhook,
								token, // Only returned once
								webhookUrl: buildWebhookUrl(webhook.id, token),
								transactionId: txid,
							})
						}).pipe(policyUse(ChannelWebhookPolicy.canCreate(payload.channelId))),
					)
					.pipe(withRemapDbErrors("ChannelWebhook", "create")),

			"channelWebhook.list": ({ channelId }) =>
				Effect.gen(function* () {
					const webhookRepo = yield* ChannelWebhookRepo

					const webhooks = yield* webhookRepo.findByChannel(channelId)

					return new ChannelWebhookListResponse({ data: webhooks })
				}).pipe(
					policyUse(ChannelWebhookPolicy.canRead(channelId)),
					withRemapDbErrors("ChannelWebhook", "select"),
				),

			"channelWebhook.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const webhookRepo = yield* ChannelWebhookRepo
							const botService = yield* WebhookBotService

							// Get current webhook
							const webhookOption = yield* webhookRepo.findById(id).pipe(withSystemActor)
							if (Option.isNone(webhookOption)) {
								return yield* Effect.fail(new ChannelWebhookNotFoundError({ webhookId: id }))
							}
							const currentWebhook = webhookOption.value

							// Update webhook
							const updatedWebhook = yield* webhookRepo
								.update({
									id,
									name: payload.name,
									description: payload.description,
									avatarUrl: payload.avatarUrl,
									isEnabled: payload.isEnabled,
								})
								.pipe(withSystemActor)

							// Update bot user if name or avatar changed
							if (payload.name !== undefined || payload.avatarUrl !== undefined) {
								yield* botService.updateWebhookBot(
									currentWebhook.botUserId,
									payload.name ?? currentWebhook.name,
									payload.avatarUrl !== undefined
										? payload.avatarUrl
										: currentWebhook.avatarUrl,
								)
							}

							const txid = yield* generateTransactionId()

							return new ChannelWebhookResponse({
								data: updatedWebhook,
								transactionId: txid,
							})
						}).pipe(policyUse(ChannelWebhookPolicy.canUpdate(id))),
					)
					.pipe(withRemapDbErrors("ChannelWebhook", "update")),

			"channelWebhook.regenerateToken": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const webhookRepo = yield* ChannelWebhookRepo

							// Get current webhook
							const webhookOption = yield* webhookRepo.findById(id).pipe(withSystemActor)
							if (Option.isNone(webhookOption)) {
								return yield* Effect.fail(new ChannelWebhookNotFoundError({ webhookId: id }))
							}

							// Generate new token
							const { token, tokenHash, tokenSuffix } = generateToken()

							// Update token
							const [updatedWebhook] = yield* webhookRepo.updateToken(
								id,
								tokenHash,
								tokenSuffix,
							)

							const txid = yield* generateTransactionId()

							return new ChannelWebhookCreatedResponse({
								data: updatedWebhook,
								token, // Only returned once
								webhookUrl: buildWebhookUrl(id, token),
								transactionId: txid,
							})
						}).pipe(policyUse(ChannelWebhookPolicy.canUpdate(id))),
					)
					.pipe(withRemapDbErrors("ChannelWebhook", "update")),

			"channelWebhook.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const webhookRepo = yield* ChannelWebhookRepo

							// Check webhook exists
							const webhookOption = yield* webhookRepo.findById(id).pipe(withSystemActor)
							if (Option.isNone(webhookOption)) {
								return yield* Effect.fail(new ChannelWebhookNotFoundError({ webhookId: id }))
							}

							// Soft delete webhook only - bot user cleanup can be handled separately
							// (e.g., by admin or background job) since integrations may create webhooks
							// and users shouldn't need permission to delete integration-created bot users
							yield* webhookRepo.softDelete(id)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}).pipe(policyUse(ChannelWebhookPolicy.canDelete(id))),
					)
					.pipe(withRemapDbErrors("ChannelWebhook", "delete")),
		}
	}),
)
