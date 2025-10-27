import { Headers } from "@effect/platform"
import { CurrentUser, UnauthorizedError, withSystemActor } from "@hazel/effect-lib"
import { Config, Effect, FiberRef, Layer, Option } from "effect"
import { UserPresenceStatusRepo } from "../../repositories/user-presence-status-repo"
import { UserRepo } from "../../repositories/user-repo"
import { WorkOS } from "../../services/workos"
import { AuthMiddleware } from "./auth-class"

export { AuthMiddleware } from "./auth-class"

export const AuthMiddlewareLive = Layer.scoped(
	AuthMiddleware,
	Effect.gen(function* () {
		const userRepo = yield* UserRepo
		const presenceRepo = yield* UserPresenceStatusRepo
		const workos = yield* WorkOS
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
						new UnauthorizedError({
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
						new UnauthorizedError({
							message: "No WorkOS session cookie provided",
							detail: "Authentication required",
						}),
					)
				}

				// Load and verify the sealed session
				const res = yield* workos
					.call(async (client) =>
						client.userManagement.loadSealedSession({
							sessionData: sessionCookie,
							cookiePassword: workOsCookiePassword,
						}),
					)
					.pipe(
						Effect.catchTag("WorkOSApiError", (error) =>
							Effect.fail(
								new UnauthorizedError({
									message: "Failed to get session from cookie",
									detail: String(error.cause),
								}),
							),
						),
					)

				const session = yield* Effect.tryPromise(() => res.authenticate()).pipe(
					Effect.catchTag("UnknownException", (error) =>
						Effect.fail(
							new UnauthorizedError({
								message: "Failed to call authenticate on sealed session",
								detail: String(error.cause),
							}),
						),
					),
				)

				if (!session.authenticated) {
					return yield* Effect.fail(
						new UnauthorizedError({
							message: "Session not authenticated",
							detail: session.reason || "Unknown reason",
						}),
					)
				}

				// Find user by WorkOS external ID
				const user = yield* userRepo
					.findByExternalId(session.user.id)
					.pipe(Effect.orDie, withSystemActor)

				if (Option.isNone(user)) {
					return yield* Effect.fail(
						new UnauthorizedError({
							message: "User not found",
							detail: `The user ${session.user.id} was not found`,
						}),
					)
				}

				const currentUser = new CurrentUser.Schema({
					id: user.value.id,
					role: (session.role as "admin" | "member") || "member",
					workosOrganizationId: session.organizationId,
					avatarUrl: user.value.avatarUrl,
					firstName: user.value.firstName,
					lastName: user.value.lastName,
					email: user.value.email,
				})

				// Store the current user in the FiberRef so the finalizer can access it
				yield* FiberRef.set(currentUserRef, Option.some(currentUser))

				return currentUser
			}),
		)
	}),
)
