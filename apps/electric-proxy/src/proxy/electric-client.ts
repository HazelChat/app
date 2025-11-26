import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client"
import { Effect, Schema } from "effect"
import { ProxyConfigService } from "../config"

/**
 * Error thrown when Electric proxy request fails
 */
export class ElectricProxyError extends Schema.TaggedError<ElectricProxyError>()("ElectricProxyError", {
	message: Schema.String,
	detail: Schema.optional(Schema.String),
}) {}

/**
 * Prepares the Electric SQL proxy URL from a request URL
 * Copies over Electric-specific query params and adds auth if configured
 *
 * @param requestUrl - The incoming request URL
 * @returns Effect that succeeds with the prepared Electric SQL origin URL
 */
export const prepareElectricUrl = (requestUrl: string) =>
	Effect.gen(function* () {
		const config = yield* ProxyConfigService
		const url = new URL(requestUrl)
		const originUrl = new URL(`${config.electricUrl}/v1/shape`)

		// Copy Electric-specific query params
		url.searchParams.forEach((value, key) => {
			if (
				ELECTRIC_PROTOCOL_QUERY_PARAMS.some((param) => key === param || key.startsWith(`${param}[`))
			) {
				originUrl.searchParams.set(key, value)
			}
		})

		// Add Electric Cloud authentication if configured
		if (config.electricSourceId && config.electricSourceSecret) {
			originUrl.searchParams.set("source_id", config.electricSourceId)
			originUrl.searchParams.set("secret", config.electricSourceSecret)
		}

		return originUrl
	})

/**
 * Proxies a request to Electric SQL and returns the response
 * Uses zero-copy body passthrough for maximum streaming performance
 *
 * @param originUrl - The prepared Electric SQL URL
 * @returns Effect that succeeds with the proxied response
 */
export const proxyElectricRequest = (originUrl: URL) =>
	Effect.gen(function* () {
		yield* Effect.log("Proxying to Electric", { url: originUrl.toString() })

		const response = yield* Effect.tryPromise({
			try: () => fetch(originUrl),
			catch: (error) =>
				new ElectricProxyError({
					message: "Failed to fetch from Electric SQL",
					detail: String(error),
				}),
		})

		// Prepare response headers
		const headers = new Headers(response.headers)
		headers.delete("content-encoding")
		headers.delete("content-length")
		headers.set("vary", "cookie")

		yield* Effect.log("Electric response received", {
			status: response.status,
			contentType: response.headers.get("content-type"),
		})

		// Return response with body stream - zero-copy passthrough
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	})
