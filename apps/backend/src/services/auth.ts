import { CurrentUser, UnauthorizedError } from "@hazel/effect-lib"
import { Config, Effect, Layer, Option, Redacted } from "effect"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { UserRepo } from "../repositories/user-repo"
import { WorkOS } from "./workos"

export const AuthorizationLive = Layer.effect(
	CurrentUser.Authorization,
	Effect.gen(function* () {
		yield* Effect.log("Initializing Authorization middleware...")

		const userRepo = yield* UserRepo
		const workos = yield* WorkOS

		const workOsCookiePassword = yield* Config.string("WORKOS_COOKIE_PASSWORD").pipe(Effect.orDie)

		return {
			cookie: (cookie) =>
				Effect.gen(function* () {
					yield* Effect.log("checking cookie")
					const res = yield* workos
						.call(async (client) =>
							client.userManagement.loadSealedSession({
								sessionData: Redacted.value(cookie),
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
						Effect.tapError((error) => Effect.log("authenticate error", error)),
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
								message: "Failed to authenticate session",
								detail: "The session was not authenticated",
							}),
						)
					}

					const user = yield* userRepo.findByExternalId(session.user.id).pipe(Effect.orDie)

					if (Option.isNone(user)) {
						return yield* Effect.fail(
							new UnauthorizedError({
								message: "User not found",
								detail: `The user ${session.user.id} was not found`,
							}),
						)
					}

					return new CurrentUser.Schema({
						id: user.value.id,
						role: (session.role as "admin" | "member") || "member",
						workosOrganizationId: session.organizationId,
						avatarUrl: user.value.avatarUrl,
						firstName: user.value.firstName,
						lastName: user.value.lastName,
						email: user.value.email,
					})
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

					const user = yield* userRepo.findByExternalId(workOsUserId).pipe(Effect.orDie)

					if (Option.isNone(user)) {
						return yield* Effect.fail(
							new UnauthorizedError({
								message: "User not found",
								detail: `The provided token ${rawToken} is missing the user ID`,
							}),
						)
					}

					yield* Effect.annotateCurrentSpan("userId", user.value.id)

					return new CurrentUser.Schema({
						id: user.value.id,
						role: (payload.role as "admin" | "member") || "member",
						workosOrganizationId: payload.organizationId as string | undefined,
						avatarUrl: user.value.avatarUrl,
						firstName: user.value.firstName,
						lastName: user.value.lastName,
						email: user.value.email,
					})
				}),
		}
	}),
)
