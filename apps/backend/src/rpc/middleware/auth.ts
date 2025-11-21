import { Headers } from "@effect/platform"
import { type CurrentUser, SessionNotProvidedError, withSystemActor } from "@hazel/domain"
import { Config, Effect, FiberRef, Layer, Option } from "effect"
import { UserPresenceStatusRepo } from "../../repositories/user-presence-status-repo"
import { SessionManager } from "../../services/session-manager"
import { AuthMiddleware } from "./auth-class"

export { AuthMiddleware } from "./auth-class"

export const AuthMiddlewareLive = Layer.scoped(
	AuthMiddleware,
	Effect.gen(function* () {
		const sessionManager = yield* SessionManager
		const presenceRepo = yield* UserPresenceStatusRepo
		const workOsCookiePassword = yield* Config.string("WORKOS_COOKIE_PASSWORD").pipe(Effect.orDie)

		// Create a FiberRef to track the current user in each WebSocket connection
		const currentUserRef = yield* FiberRef.make<Option.Option<CurrentUser.Schema>>(Option.none())

		// Add finalizer that runs when the WebSocket scope closes
		yield* Effect.addFinalizer(() =>
			Effect.gen(function* () {
				const userOption = yield* FiberRef.get(currentUserRef)
				if (Option.isSome(userOption)) {
					yield* Effect.logInfo("Closing WebSocket connection")
					const user = userOption.value
					yield* presenceRepo
						.updateStatus({
							userId: user.id,
							status: "offline",
							customMessage: null,
						})
						.pipe(
							withSystemActor,
							Effect.catchAll((error) =>
								Effect.logError("Failed to mark user offline on disconnect", error),
							),
						)
				}
			}),
		)

		return AuthMiddleware.of(({ headers }) =>
			Effect.gen(function* () {
				// Extract cookies from headers
				const cookieHeader = Headers.get(headers, "cookie")

				if (Option.isNone(cookieHeader)) {
					return yield* Effect.fail(
						new SessionNotProvidedError({
							message: "No session cookie provided",
							detail: "Authentication required",
						}),
					)
				}

				// Parse cookies to find the workos-session cookie
				const cookies = cookieHeader.value
					.split(";")
					.map((c) => c.trim())
					.reduce(
						(acc, cookie) => {
							const [key, ...valueParts] = cookie.split("=")
							if (key && valueParts.length > 0) {
								acc[key] = valueParts.join("=")
							}
							return acc
						},
						{} as Record<string, string>,
					)

				const sessionCookie = cookies["workos-session"]

				if (!sessionCookie) {
					return yield* Effect.fail(
						new SessionNotProvidedError({
							message: "No WorkOS session cookie provided",
							detail: "Authentication required",
						}),
					)
				}

				// Use SessionManager to handle authentication and refresh logic
				// Note: For WebSocket connections, we can't update the cookie, but we can
				// still allow the connection if the session can be refreshed
				const result = yield* sessionManager.authenticateAndGetUser(
					sessionCookie,
					workOsCookiePassword,
				)

				// Store the current user in the FiberRef so the finalizer can access it
				yield* FiberRef.set(currentUserRef, Option.some(result.currentUser))

				// Log if a session was refreshed (client should reconnect with new cookie on next HTTP request)
				if (result.refreshedSession) {
					yield* Effect.log(
						"Session was refreshed for WebSocket connection. Client should update cookie on next HTTP request.",
					)
				}

				return result.currentUser
			}),
		)
	}),
)
