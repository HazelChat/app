import { HttpApiBuilder, HttpApiClient, type HttpApiError, HttpServerRequest } from "@effect/platform"
import { Cluster, InternalServerError, withSystemActor } from "@hazel/domain"
import type { Event } from "@workos-inc/node"
import { Config, Effect, pipe } from "effect"
import { HazelApi, InvalidWebhookSignature, WebhookResponse } from "../api"
import { WorkOSSync } from "../services/workos-sync"
import { WorkOSWebhookVerifier } from "../services/workos-webhook"

export const HttpWebhookLive = HttpApiBuilder.group(HazelApi, "webhooks", (handlers) =>
	handlers
		.handle("workos", (_args) =>
			Effect.gen(function* () {
				// Get the raw request to access headers and body
				const request = yield* HttpServerRequest.HttpServerRequest

				// Get the signature header
				const signatureHeader = request.headers["workos-signature"]
				if (!signatureHeader) {
					return yield* Effect.fail(
						new InvalidWebhookSignature({
							message: "Missing workos-signature header",
						}),
					)
				}

				// Get the raw body as string for signature verification
				// The body should be the raw JSON string
				const rawBody = yield* pipe(
					request.text,
					Effect.orElseFail(
						() =>
							new InvalidWebhookSignature({
								message: "Invalid request body",
							}),
					),
				)

				// Verify the webhook signature
				const verifier = yield* WorkOSWebhookVerifier
				yield* pipe(
					verifier.verifyWebhook(signatureHeader, rawBody),
					Effect.mapError((error) => {
						if (
							error._tag === "WebhookVerificationError" ||
							error._tag === "WebhookTimestampError"
						) {
							return new InvalidWebhookSignature({
								message: error.message,
							})
						}
						return error
					}),
				)

				// Parse the webhook payload
				const payload = JSON.parse(rawBody) as Event

				// Log the incoming webhook event
				yield* Effect.logInfo(`Processing WorkOS webhook event: ${payload.event}`, {
					eventId: payload.id,
					eventType: payload.event,
				})

				// Process the webhook event using the sync service
				const syncService = yield* WorkOSSync
				const result = yield* syncService.processWebhookEvent(payload)

				if (!result.success) {
					const errorMessage = "error" in result ? result.error : "Unknown error"
					yield* Effect.logError(`Failed to process webhook event: ${errorMessage}`, {
						eventId: payload.id,
						eventType: payload.event,
						error: errorMessage,
					})
				} else {
					yield* Effect.logInfo(`Successfully processed webhook event`, {
						eventId: payload.id,
						eventType: payload.event,
					})
				}

				// Return success response quickly (WorkOS expects 200 OK)
				return new WebhookResponse({
					success: result.success,
					message: result.success
						? "Event processed successfully"
						: "error" in result
							? result.error
							: "Unknown error",
				})
			}).pipe(withSystemActor),
		)
		.handle("sequinWebhook", ({ payload }) =>
			Effect.gen(function* () {
				// Log the incoming webhook batch
				yield* Effect.logInfo("Received Sequin webhook batch", {
					eventCount: payload.data.length,
				})

				// Get cluster URL from config
				const clusterUrl = yield* Config.string("CLUSTER_URL").pipe(Effect.orDie)

				// Get the Cluster API client once for all events
				const client = yield* HttpApiClient.make(Cluster.WorkflowApi, {
					baseUrl: clusterUrl,
				})

				// Process each event in the batch
				yield* Effect.forEach(
					payload.data,
					(event) =>
						Effect.gen(function* () {
							// Log each event
							yield* Effect.logInfo("Processing Sequin event", {
								action: event.action,
								tableName: event.metadata.table_name,
								messageId: event.record.id,
								channelId: event.record.channelId,
							})

							// Only process 'insert' actions (new messages)
							if (event.action !== "insert") {
								yield* Effect.logInfo("Ignoring non-insert action", {
									action: event.action,
									messageId: event.record.id,
								})
								return
							}

							// Execute the MessageNotificationWorkflow via HTTP
							// The WorkflowProxy creates an endpoint named after the workflow
							yield* client.workflows
								.MessageNotificationWorkflow({
									payload: {
										messageId: event.record.id,
										channelId: event.record.channelId,
										authorId: event.record.authorId,
									},
								})
								.pipe(
									Effect.catchTags({
										HttpApiDecodeError: (_error) =>
											Effect.fail(
												new InternalServerError({
													message: "Failed to execute notification workflow",
												}),
											),
										ParseError: (_error) =>
											Effect.fail(
												new InternalServerError({
													message: "Failed to execute notification workflow",
												}),
											),
										RequestError: (_error) =>
											Effect.fail(
												new InternalServerError({
													message: "Failed to execute notification workflow",
												}),
											),
										ResponseError: (_error) =>
											Effect.fail(
												new InternalServerError({
													message: "Failed to execute notification workflow",
												}),
											),
									}),
								)

							yield* Effect.logInfo("Event processed successfully", {
								messageId: event.record.id,
							})
						}),
					{ concurrency: "unbounded" },
				)

				yield* Effect.logInfo("Sequin webhook batch processed successfully", {
					eventCount: payload.data.length,
				})
			}).pipe(withSystemActor),
		),
)
