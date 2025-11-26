import { Config, Context, Effect, Layer, Option, type Redacted } from "effect"

/**
 * Proxy configuration service
 */
export interface ProxyConfig {
	readonly electricUrl: string
	readonly electricSourceId: string | undefined
	readonly electricSourceSecret: string | undefined
	readonly workosApiKey: string
	readonly workosClientId: string
	readonly workosPasswordCookie: Redacted.Redacted<string>
	readonly allowedOrigin: string
	readonly databaseUrl: Redacted.Redacted<string>
	readonly isDev: boolean
	readonly port: number
	readonly otlpEndpoint: string | undefined
}

export class ProxyConfigService extends Context.Tag("ProxyConfigService")<
	ProxyConfigService,
	ProxyConfig
>() {}

export const ProxyConfigLive = Layer.effect(
	ProxyConfigService,
	Effect.gen(function* () {
		const electricUrl = yield* Config.string("ELECTRIC_URL")
		const electricSourceId = yield* Config.string("ELECTRIC_SOURCE_ID").pipe(
			Config.option,
			Effect.map(Option.getOrUndefined),
		)
		const electricSourceSecret = yield* Config.string("ELECTRIC_SOURCE_SECRET").pipe(
			Config.option,
			Effect.map(Option.getOrUndefined),
		)
		const workosApiKey = yield* Config.string("WORKOS_API_KEY")
		const workosClientId = yield* Config.string("WORKOS_CLIENT_ID")
		const workosPasswordCookie = yield* Config.redacted("WORKOS_COOKIE_PASSWORD")
		const allowedOrigin = yield* Config.string("ALLOWED_ORIGIN").pipe(
			Config.withDefault("http://localhost:3000"),
		)
		const databaseUrl = yield* Config.redacted("DATABASE_URL")
		const isDev = yield* Config.boolean("IS_DEV").pipe(Config.withDefault(true))
		const port = yield* Config.number("PORT").pipe(Config.withDefault(8184))
		const otlpEndpoint = yield* Config.string("OTLP_ENDPOINT").pipe(
			Config.option,
			Effect.map(Option.getOrUndefined),
		)

		return {
			electricUrl,
			electricSourceId,
			electricSourceSecret,
			workosApiKey,
			workosClientId,
			workosPasswordCookie,
			allowedOrigin,
			databaseUrl,
			isDev,
			port,
			otlpEndpoint,
		}
	}),
)
