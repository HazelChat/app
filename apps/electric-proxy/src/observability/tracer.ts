import { OtlpTracer } from "@effect/opentelemetry"
import { FetchHttpClient } from "@effect/platform"
import { Effect, Layer } from "effect"
import { ProxyConfigService } from "../config"

/**
 * Create the OpenTelemetry tracer layer
 * Only enabled if OTLP_ENDPOINT is configured
 */
export const makeTracerLive = Effect.gen(function* () {
	const config = yield* ProxyConfigService

	if (!config.otlpEndpoint) {
		yield* Effect.log("OTLP_ENDPOINT not configured, tracing disabled")
		return Layer.empty
	}

	yield* Effect.log("Initializing OpenTelemetry tracer", { endpoint: config.otlpEndpoint })

	return OtlpTracer.layer({
		url: config.otlpEndpoint,
		resource: {
			serviceName: "electric-proxy-bun",
		},
	}).pipe(Layer.provide(FetchHttpClient.layer))
})

/**
 * The tracer layer - conditionally provides tracing based on config
 */
export const TracerLive = Layer.unwrapEffect(makeTracerLive)
