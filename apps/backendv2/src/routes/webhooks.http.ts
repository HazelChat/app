import { HttpApiBuilder, HttpServerRequest } from "@effect/platform"
import type { Event } from "@workos-inc/node"
import { Effect, pipe } from "effect"
import { HazelApi, InvalidWebhookSignature, WebhookResponse } from "../api"
import { WorkOSSync } from "../services/workos-sync"
import { WorkOSWebhookVerifier } from "../services/workos-webhook"

export const HttpWebhookLive = HttpApiBuilder.group(HazelApi, "webhooks", (handlers) =>
	handlers.handle("workos", (_args) =>
		Effect.gen(function* () {
			// Get the raw request to access headers and body
			const request = yield* HttpServerRequest.HttpServerRequest

			// Get the signature header
			const signatureHeader = request.headers["workos-signature"]
			if (!signatureHeader) {
				yield* Effect.fail(
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
					if (error._tag === "WebhookVerificationError" || error._tag === "WebhookTimestampError") {
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
		}),
	),
)
