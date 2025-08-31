import * as crypto from "node:crypto"
import { Config, Effect, Schema } from "effect"

// Error types
export class WebhookVerificationError extends Schema.TaggedError<WebhookVerificationError>(
	"WebhookVerificationError",
)("WebhookVerificationError", {
	message: Schema.String,
}) {}

export class WebhookTimestampError extends Schema.TaggedError<WebhookTimestampError>("WebhookTimestampError")(
	"WebhookTimestampError",
	{
		message: Schema.String,
		timestamp: Schema.Number,
		currentTime: Schema.Number,
	},
) {}

export interface WorkOSWebhookSignature {
	timestamp: number
	signature: string
}

export class WorkOSWebhookVerifier extends Effect.Service<WorkOSWebhookVerifier>()("WorkOSWebhookVerifier", {
	accessors: true,
	effect: Effect.gen(function* () {
		// Get webhook secret from config
		const webhookSecret = yield* Config.string("WORKOS_WEBHOOK_SECRET")

		/**
		 * Parse the WorkOS-Signature header
		 * Format: "t=<timestamp>, sig=<signature>"
		 */
		const parseSignatureHeader = (
			header: string,
		): Effect.Effect<WorkOSWebhookSignature, WebhookVerificationError> =>
			Effect.gen(function* () {
				const parts = header.split(", ")
				if (parts.length !== 2) {
					yield* Effect.fail(
						new WebhookVerificationError({
							message: "Invalid signature header format",
						}),
					)
				}

				const timestampPart = parts[0]
				const signaturePart = parts[1]

				if (!timestampPart.startsWith("t=") || !signaturePart.startsWith("sig=")) {
					yield* Effect.fail(
						new WebhookVerificationError({
							message: "Invalid signature header format",
						}),
					)
				}

				const timestamp = parseInt(timestampPart.slice(2), 10)
				const signature = signaturePart.slice(4)

				if (Number.isNaN(timestamp)) {
					yield* Effect.fail(
						new WebhookVerificationError({
							message: "Invalid timestamp in signature header",
						}),
					)
				}

				return { timestamp, signature }
			})

		/**
		 * Validate timestamp to prevent replay attacks
		 * Default tolerance is 5 minutes (300 seconds)
		 */
		const validateTimestamp = (
			timestamp: number,
			toleranceSeconds = 300,
		): Effect.Effect<void, WebhookTimestampError> =>
			Effect.gen(function* () {
				const currentTime = Math.floor(Date.now() / 1000)
				const difference = Math.abs(currentTime - timestamp)

				if (difference > toleranceSeconds) {
					yield* Effect.fail(
						new WebhookTimestampError({
							message: `Webhook timestamp is too old. Difference: ${difference}s, Tolerance: ${toleranceSeconds}s`,
							timestamp,
							currentTime,
						}),
					)
				}
			})

		/**
		 * Compute the expected signature using HMAC SHA256
		 */
		const computeSignature = (timestamp: number, payload: string): string => {
			const signedPayload = `${timestamp}.${payload}`
			const hmac = crypto.createHmac("sha256", webhookSecret)
			hmac.update(signedPayload)
			return hmac.digest("hex")
		}

		/**
		 * Verify the webhook signature
		 */
		const verifyWebhook = (
			signatureHeader: string,
			payload: string,
			options?: {
				timestampTolerance?: number
			},
		): Effect.Effect<void, WebhookVerificationError | WebhookTimestampError> =>
			Effect.gen(function* () {
				// Parse the signature header
				const { timestamp, signature } = yield* parseSignatureHeader(signatureHeader)

				// Validate timestamp
				yield* validateTimestamp(timestamp, options?.timestampTolerance)

				// Compute expected signature
				const expectedSignature = computeSignature(timestamp, payload)

				// Compare signatures using timing-safe comparison
				const signatureBuffer = Buffer.from(signature, "hex")
				const expectedBuffer = Buffer.from(expectedSignature, "hex")

				if (signatureBuffer.length !== expectedBuffer.length) {
					yield* Effect.fail(
						new WebhookVerificationError({
							message: "Invalid signature length",
						}),
					)
				}

				if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
					yield* Effect.fail(
						new WebhookVerificationError({
							message: "Invalid webhook signature",
						}),
					)
				}

				yield* Effect.logInfo("WorkOS webhook signature verified successfully")
			})

		return {
			verifyWebhook,
			parseSignatureHeader,
			validateTimestamp,
			computeSignature,
		}
	}),
}) {}
