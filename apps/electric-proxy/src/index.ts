import { Database } from "@hazel/db"
import { Effect, Layer, Logger, Runtime } from "effect"
import { type BotAuthenticationError, validateBotToken } from "./auth/bot-auth"
import { type AuthenticationError, validateSession } from "./auth/user-auth"
import { ProxyConfigLive, ProxyConfigService } from "./config"
import { type ElectricProxyError, prepareElectricUrl, proxyElectricRequest } from "./proxy/electric-client"
import { type BotTableAccessError, getBotWhereClauseForTable, validateBotTable } from "./tables/bot-tables"
import { getWhereClauseForTable, type TableAccessError, validateTable } from "./tables/user-tables"

// =============================================================================
// CORS HELPERS
// =============================================================================

/**
 * Get CORS headers for user flow response
 * Note: When using credentials, we must specify exact origin instead of "*"
 */
function getUserCorsHeaders(allowedOrigin: string, requestOrigin: string | null): Record<string, string> {
	const origin = requestOrigin === allowedOrigin ? allowedOrigin : "null"
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Cookie, Authorization",
		"Access-Control-Allow-Credentials": "true",
		Vary: "Origin, Cookie",
	}
}

const BOT_CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// =============================================================================
// USER FLOW HANDLER
// =============================================================================

const handleUserRequest = (request: Request) =>
	Effect.gen(function* () {
		const config = yield* ProxyConfigService
		const allowedOrigin = config.allowedOrigin
		const requestOrigin = request.headers.get("Origin")
		const corsHeaders = getUserCorsHeaders(allowedOrigin, requestOrigin)

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders })
		}

		// Method check
		if (request.method !== "GET" && request.method !== "DELETE") {
			return new Response("Method not allowed", {
				status: 405,
				headers: { Allow: "GET, DELETE, OPTIONS", ...corsHeaders },
			})
		}

		// Authenticate user
		const user = yield* validateSession(request)

		// Extract and validate table parameter
		const url = new URL(request.url)
		const tableParam = url.searchParams.get("table")
		const tableValidation = validateTable(tableParam)

		if (!tableValidation.valid) {
			return new Response(JSON.stringify({ error: tableValidation.error }), {
				status: tableParam ? 403 : 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			})
		}

		// Prepare Electric URL
		const originUrl = yield* prepareElectricUrl(request.url)
		originUrl.searchParams.set("table", tableValidation.table!)

		// Generate WHERE clause
		const whereClause = yield* getWhereClauseForTable(tableValidation.table!, user)
		yield* Effect.log("Generated WHERE clause", { table: tableValidation.table, whereClause })
		originUrl.searchParams.set("where", whereClause)

		// Proxy request to Electric
		const response = yield* proxyElectricRequest(originUrl)

		// Add CORS headers to response
		const headers = new Headers(response.headers)
		for (const [key, value] of Object.entries(corsHeaders)) {
			headers.set(key, value)
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	}).pipe(
		// Error handling
		Effect.catchTag("AuthenticationError", (error: AuthenticationError) =>
			Effect.gen(function* () {
				const config = yield* ProxyConfigService
				const requestOrigin = request.headers.get("Origin")
				yield* Effect.logInfo("Authentication failed", { error: error.message, detail: error.detail })
				return new Response(
					JSON.stringify({
						error: error.message,
						detail: error.detail,
						timestamp: new Date().toISOString(),
						hint: "Check if session cookie is present and valid",
					}),
					{
						status: 401,
						headers: {
							"Content-Type": "application/json",
							...getUserCorsHeaders(config.allowedOrigin, requestOrigin),
						},
					},
				)
			}),
		),
		Effect.catchTag("TableAccessError", (error: TableAccessError) =>
			Effect.gen(function* () {
				const config = yield* ProxyConfigService
				const requestOrigin = request.headers.get("Origin")
				yield* Effect.logError("Table access error", { error: error.message, table: error.table })
				return new Response(
					JSON.stringify({ error: error.message, detail: error.detail, table: error.table }),
					{
						status: 500,
						headers: {
							"Content-Type": "application/json",
							...getUserCorsHeaders(config.allowedOrigin, requestOrigin),
						},
					},
				)
			}),
		),
		Effect.catchTag("ElectricProxyError", (error: ElectricProxyError) =>
			Effect.gen(function* () {
				const config = yield* ProxyConfigService
				const requestOrigin = request.headers.get("Origin")
				yield* Effect.logError("Electric proxy error", { error: error.message })
				return new Response(JSON.stringify({ error: error.message, detail: error.detail }), {
					status: 502,
					headers: {
						"Content-Type": "application/json",
						...getUserCorsHeaders(config.allowedOrigin, requestOrigin),
					},
				})
			}),
		),
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				const config = yield* ProxyConfigService
				const requestOrigin = request.headers.get("Origin")
				yield* Effect.logError("Unexpected error in user flow", { error: String(error) })
				return new Response(
					JSON.stringify({ error: "Internal server error", detail: String(error) }),
					{
						status: 500,
						headers: {
							"Content-Type": "application/json",
							...getUserCorsHeaders(config.allowedOrigin, requestOrigin),
						},
					},
				)
			}),
		),
	)

// =============================================================================
// BOT FLOW HANDLER
// =============================================================================

const handleBotRequest = (request: Request) =>
	Effect.gen(function* () {
		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: BOT_CORS_HEADERS })
		}

		// Method check
		if (request.method !== "GET" && request.method !== "DELETE") {
			return new Response("Method not allowed", {
				status: 405,
				headers: { Allow: "GET, DELETE, OPTIONS", ...BOT_CORS_HEADERS },
			})
		}

		// Authenticate bot
		const bot = yield* validateBotToken(request)

		// Extract and validate table parameter
		const url = new URL(request.url)
		const tableParam = url.searchParams.get("table")
		const tableValidation = validateBotTable(tableParam)

		if (!tableValidation.valid) {
			return new Response(JSON.stringify({ error: tableValidation.error }), {
				status: tableParam ? 403 : 400,
				headers: { "Content-Type": "application/json", ...BOT_CORS_HEADERS },
			})
		}

		// Prepare Electric URL
		const originUrl = yield* prepareElectricUrl(request.url)
		originUrl.searchParams.set("table", tableValidation.table!)

		// Generate WHERE clause
		const whereClause = yield* getBotWhereClauseForTable(tableValidation.table!, bot)
		yield* Effect.log("Generated bot WHERE clause", { table: tableValidation.table, whereClause })
		originUrl.searchParams.set("where", whereClause)

		// Proxy request to Electric
		const response = yield* proxyElectricRequest(originUrl)

		// Add CORS headers to response
		const headers = new Headers(response.headers)
		for (const [key, value] of Object.entries(BOT_CORS_HEADERS)) {
			headers.set(key, value)
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	}).pipe(
		// Error handling
		Effect.catchTag("BotAuthenticationError", (error: BotAuthenticationError) =>
			Effect.gen(function* () {
				yield* Effect.logInfo("Bot authentication failed", {
					error: error.message,
					detail: error.detail,
				})
				return new Response(
					JSON.stringify({
						error: error.message,
						detail: error.detail,
						timestamp: new Date().toISOString(),
						hint: "Check if Authorization header contains valid Bearer token",
					}),
					{
						status: 401,
						headers: { "Content-Type": "application/json", ...BOT_CORS_HEADERS },
					},
				)
			}),
		),
		Effect.catchTag("BotTableAccessError", (error: BotTableAccessError) =>
			Effect.gen(function* () {
				yield* Effect.logError("Bot table access error", { error: error.message, table: error.table })
				return new Response(
					JSON.stringify({ error: error.message, detail: error.detail, table: error.table }),
					{ status: 500, headers: { "Content-Type": "application/json", ...BOT_CORS_HEADERS } },
				)
			}),
		),
		Effect.catchTag("ElectricProxyError", (error: ElectricProxyError) =>
			Effect.gen(function* () {
				yield* Effect.logError("Electric proxy error (bot)", { error: error.message })
				return new Response(JSON.stringify({ error: error.message, detail: error.detail }), {
					status: 502,
					headers: { "Content-Type": "application/json", ...BOT_CORS_HEADERS },
				})
			}),
		),
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				yield* Effect.logError("Unexpected error in bot flow", { error: String(error) })
				return new Response(
					JSON.stringify({ error: "Internal server error", detail: String(error) }),
					{
						status: 500,
						headers: { "Content-Type": "application/json", ...BOT_CORS_HEADERS },
					},
				)
			}),
		),
	)

// =============================================================================
// LAYERS
// =============================================================================

const DatabaseLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const config = yield* ProxyConfigService
		yield* Effect.log("Connecting to database", { isDev: config.isDev })
		return Database.layer({
			url: config.databaseUrl,
			ssl: !config.isDev,
		})
	}),
)

const LoggerLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const config = yield* ProxyConfigService
		return config.isDev ? Logger.pretty : Logger.structured
	}),
).pipe(Layer.provide(ProxyConfigLive))

const MainLive = DatabaseLive.pipe(Layer.provideMerge(ProxyConfigLive), Layer.provideMerge(LoggerLive))

// =============================================================================
// MAIN
// =============================================================================

const main = Effect.gen(function* () {
	const config = yield* ProxyConfigService

	yield* Effect.log("Starting Electric Proxy (Bun)", {
		port: config.port,
		electricUrl: config.electricUrl,
		allowedOrigin: config.allowedOrigin,
	})

	// Create Effect runtime for request handlers
	const runtime = yield* Effect.runtime<ProxyConfigService | Database.Database>()

	// Start Bun server
	const server = Bun.serve({
		port: config.port,
		hostname: "::",
		idleTimeout: 120,
		fetch: async (request: Request) => {
			const url = new URL(request.url)

			// Health check
			if (url.pathname === "/health") {
				return new Response("OK", { status: 200 })
			}

			// Bot requests
			if (url.pathname === "/bot/v1/shape") {
				return Runtime.runPromise(runtime)(handleBotRequest(request))
			}

			// User requests (default)
			if (url.pathname === "/v1/shape") {
				return Runtime.runPromise(runtime)(handleUserRequest(request))
			}

			// Not found
			return new Response("Not Found", { status: 404 })
		},
	})

	yield* Effect.log(`Server listening on http://localhost:${server.port}`)

	// Keep the server running
	yield* Effect.never
})

// Run with layers
Effect.runPromise(main.pipe(Effect.provide(MainLive))).catch((error) => {
	console.error("Failed to start server:", error)
	process.exit(1)
})
