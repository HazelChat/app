import { WorkOS } from "@workos-inc/node"
import { Config, Effect, Redacted, Schema } from "effect"
import { decodeJwt } from "jose"

/**
 * JWT Payload schema from WorkOS
 */
const JwtPayload = Schema.Struct({
	sub: Schema.String,
	email: Schema.String,
	sid: Schema.String,
	org_id: Schema.optional(Schema.String),
	role: Schema.optional(Schema.String),
})

/**
 * Authenticated user context extracted from session
 */
export interface AuthenticatedUser {
	userId: string
	email: string
	organizationId?: string
	role?: string
}

/**
 * Authentication error
 */
export class AuthenticationError extends Schema.TaggedError<AuthenticationError>(
	"AuthenticationError",
)("AuthenticationError", {
	message: Schema.String,
	detail: Schema.optional(Schema.String),
}) {}

/**
 * Parse cookie header and extract a specific cookie by name
 */
function parseCookie(cookieHeader: string, cookieName: string): string | null {
	const cookies = cookieHeader.split(";").map((c) => c.trim())
	for (const cookie of cookies) {
		const [name, ...valueParts] = cookie.split("=")
		if (name === cookieName) {
			return valueParts.join("=")
		}
	}
	return null
}

/**
 * Validate a WorkOS sealed session cookie and return authenticated user
 * Uses Effect Config to read environment variables
 */
export const validateSession = Effect.fn("ElectricProxy.validateSession")(function* (
	request: Request,
) {
		// Read configuration from environment
		const workosApiKey = yield* Config.string("WORKOS_API_KEY").pipe(
			Effect.mapError(
				(error) =>
					new AuthenticationError({
						message: "WORKOS_API_KEY not configured",
						detail: String(error),
					}),
			),
		)
		const workosClientId = yield* Config.string("WORKOS_CLIENT_ID").pipe(
			Effect.mapError(
				(error) =>
					new AuthenticationError({
						message: "WORKOS_CLIENT_ID not configured",
						detail: String(error),
					}),
			),
		)
		const workOsCookiePassword = yield* Config.redacted("WORKOS_COOKIE_PASSWORD").pipe(
			Effect.mapError(
				(error) =>
					new AuthenticationError({
						message: "WORKOS_COOKIE_PASSWORD not configured",
						detail: String(error),
					}),
			),
		)

		// Extract cookie from request
		const cookieHeader = request.headers.get("Cookie")
		if (!cookieHeader) {
			return yield* Effect.fail(
				new AuthenticationError({
					message: "No cookie header found",
					detail: "Authentication required",
				}),
			)
		}

		const sessionCookie = parseCookie(cookieHeader, "workos-session")
		if (!sessionCookie) {
			return yield* Effect.fail(
				new AuthenticationError({
					message: "No workos-session cookie found",
					detail: "Authentication required",
				}),
			)
		}

		// Initialize WorkOS client
		const workos = new WorkOS(workosApiKey, {
			clientId: workosClientId,
		})

		// Load sealed session
		const sealedSession = yield* Effect.tryPromise({
			try: async () =>
				workos.userManagement.loadSealedSession({
					sessionData: sessionCookie,
					cookiePassword: Redacted.value(workOsCookiePassword),
				}),
			catch: (error) =>
				new AuthenticationError({
					message: "Failed to load sealed session",
					detail: String(error),
				}),
		})

		// Authenticate the session
		const session: any = yield* Effect.tryPromise({
			try: async () => sealedSession.authenticate(),
			catch: (error) =>
				new AuthenticationError({
					message: "Failed to authenticate session",
					detail: String(error),
				}),
		})

		// Check if authenticated
		if (!session.authenticated || !session.accessToken) {
			return yield* Effect.fail(
				new AuthenticationError({
					message: "Session not authenticated",
					detail: "Please log in again",
				}),
			)
		}

		// Decode JWT payload
		const rawPayload = decodeJwt(session.accessToken)
		const jwtPayload = yield* Schema.decodeUnknown(JwtPayload)(rawPayload).pipe(
			Effect.mapError(
				(error) =>
					new AuthenticationError({
						message: "Invalid JWT payload",
						detail: String(error),
					}),
			),
		)

		// Return authenticated user
		return {
			userId: jwtPayload.sub,
			email: jwtPayload.email,
			organizationId: jwtPayload.org_id,
			role: jwtPayload.role,
		}
	},
)
