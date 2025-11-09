import { HttpApiBuilder } from "@effect/platform"
import { CurrentUser, type OrganizationId, UnauthorizedError, withSystemActor } from "@hazel/effect-lib"
import { Config, Effect, Layer, Option, Redacted } from "effect"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { UserRepo } from "../repositories/user-repo"
import { SessionManager } from "./session-manager"
import { WorkOS } from "./workos"

export const AuthorizationLive = Layer.effect(
	CurrentUser.Authorization,
	Effect.gen(function* () {
		yield* Effect.log("Initializing Authorization middleware...")

		const userRepo = yield* UserRepo
		const workos = yield* WorkOS
		const sessionManager = yield* SessionManager

		const workOsCookiePassword = yield* Config.string("WORKOS_COOKIE_PASSWORD").pipe(Effect.orDie)
		const cookieDomain = yield* Config.string("WORKOS_COOKIE_DOMAIN").pipe(Effect.orDie)

		return {
			cookie: (cookie) =>
				Effect.gen(function* () {
					yield* Effect.log("checking cookie")

					// Use SessionManager to handle authentication and refresh logic
					const result = yield* sessionManager.authenticateAndGetUser(
						Redacted.value(cookie),
						workOsCookiePassword,
					)

					// If a new session was created via refresh, update the cookie
					if (result.refreshedSession) {
						yield* HttpApiBuilder.securitySetCookie(
							CurrentUser.Cookie,
							Redacted.make(result.refreshedSession),
							{
								secure: Bun.env.NODE_ENV === "production",
								sameSite: "lax",
								domain: cookieDomain,
								path: "/",
							},
						)
					}

					return result.currentUser
				}),
			bearer: (bearerToken) =>
				Effect.gen(function* () {
					yield* Effect.log("checking bearer token", Redacted.value(bearerToken))
					const rawToken = Redacted.value(bearerToken)
					const clientId = yield* Config.string("WORKOS_CLIENT_ID").pipe(Effect.orDie)

					const jwks = createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`))

					const { payload } = yield* Effect.tryPromise({
						try: () =>
							jwtVerify(rawToken, jwks, {
								issuer: "https://api.workos.com",
							}),
						catch: (error) => {
							console.error("JWT verification failed", error)
							return new UnauthorizedError({
								message: `Invalid token: ${error}`,
								detail: `The provided token ${rawToken} is invalid`,
							})
						},
					})

					yield* Effect.annotateCurrentSpan("workosId", payload.sub)

					const workOsUserId = payload.sub
					if (!workOsUserId) {
						return yield* Effect.fail(
							new UnauthorizedError({
								message: "Token missing user ID",
								detail: `The provided token ${rawToken} is missing the user ID`,
							}),
						)
					}

					const userOption = yield* userRepo
						.findByExternalId(workOsUserId)
						.pipe(Effect.orDie, withSystemActor)

					const user = yield* Option.match(userOption, {
						onNone: () =>
							Effect.gen(function* () {
								const workosUser = yield* workos
									.call(async (client) => client.userManagement.getUser(workOsUserId))
									.pipe(
										Effect.catchTag("WorkOSApiError", (error) =>
											Effect.fail(
												new UnauthorizedError({
													message: "Failed to fetch user from WorkOS",
													detail: String(error.cause),
												}),
											),
										),
									)

								return yield* userRepo
									.upsertByExternalId({
										externalId: workosUser.id,
										email: workosUser.email,
										firstName: workosUser.firstName || "",
										lastName: workosUser.lastName || "",
										avatarUrl: workosUser.profilePictureUrl || "",
										userType: "user",
										status: "online" as const,
										lastSeen: new Date(),
										settings: null,
										deletedAt: null,
									})
									.pipe(Effect.orDie, withSystemActor)
							}),
						onSome: (user) => Effect.succeed(user),
					})

					yield* Effect.annotateCurrentSpan("userId", user.id)

					return new CurrentUser.Schema({
						id: user.id,
						role: (payload.role as "admin" | "member") || "member",
						organizationId: payload.organizationId as OrganizationId | undefined,
						avatarUrl: user.avatarUrl,
						firstName: user.firstName,
						lastName: user.lastName,
						email: user.email,
					})
				}),
		}
	}),
)
