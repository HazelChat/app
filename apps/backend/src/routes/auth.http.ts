import { HttpApiBuilder, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Config, Effect } from "effect"
import * as jose from "jose"
import { HazelApi } from "../api"
import { UserRepo } from "../repositories/user-repo"
import { WorkOS } from "../services/workos"

export const HttpAuthLive = HttpApiBuilder.group(HazelApi, "auth", (handlers) =>
	handlers
		.handle("login", () =>
			Effect.gen(function* () {
				const workos = yield* WorkOS
				const request = yield* HttpServerRequest.HttpServerRequest
				const url = yield* HttpServerRequest.toURL(request)

				// Get optional query parameters
				const returnTo = url.searchParams.get("returnTo")
				const organizationId = url.searchParams.get("organizationId")
				const invitationToken = url.searchParams.get("invitationToken")

				// Get required configuration
				const clientId = yield* Config.string("WORKOS_CLIENT_ID").pipe(Effect.orDie)
				const redirectUri = yield* Config.string("WORKOS_REDIRECT_URI").pipe(
					Effect.orDie,
					Effect.catchAll(() => Effect.succeed("http://localhost:3003/auth/callback")),
				)

				// Create state object if we have returnTo URL
				const state = returnTo ? JSON.stringify({ returnTo }) : undefined

				// Generate authorization URL using WorkOS SDK
				const authorizationUrl = yield* workos.call(async (client) => {
					const authUrl = client.userManagement.getAuthorizationUrl({
						provider: "authkit",
						clientId,
						redirectUri,
						state,
						...(organizationId && { organizationId }),
						...(invitationToken && { invitationToken }),
					})
					return authUrl
				}).pipe(
					Effect.catchTag("WorkOSApiError", (error) =>
						Effect.fail(
							new InternalServerError({
								message: "Failed to generate authorization URL",
								detail: String(error.cause),
								cause: error,
							}),
						),
					),
				)

				// Return the authorization URL as JSON for client-side redirect
				return {
					authorizationUrl,
				}
			}).pipe(
				Effect.catchTag("NoSuchElementException", (error) =>
					Effect.fail(
						new InternalServerError({
							message: "Configuration error",
							detail: error.message,
							cause: error,
						}),
					),
				),
			),
		)
		.handle("callback", () =>
			Effect.gen(function* () {
			const workos = yield* WorkOS
			const userRepo = yield* UserRepo

			// Extract query parameters from request
			const request = yield* HttpServerRequest.HttpServerRequest
			const url = yield* HttpServerRequest.toURL(request)
			const code = url.searchParams.get("code")
			const state = url.searchParams.get("state")

			if (!code) {
				return yield* Effect.fail(
					new UnauthorizedError({
						message: "Missing authorization code",
						detail: "The authorization code was not provided in the callback",
					}),
				)
			}

			// Get required configuration
			const clientId = yield* Config.string("WORKOS_CLIENT_ID").pipe(Effect.orDie)
			const cookiePassword = yield* Config.string("WORKOS_COOKIE_PASSWORD").pipe(Effect.orDie)
			

			// Exchange code for user information using WorkOS SDK
			const authResponse = yield* workos.call(async (client) => {
				return await client.userManagement.authenticateWithCode({
					clientId,
					code,
				})
			}).pipe(
				Effect.catchTag("WorkOSApiError", (error) =>
					Effect.fail(
						new UnauthorizedError({
							message: "Failed to authenticate with WorkOS",
							detail: String(error.cause),
						}),
					),
				),
			)

			const { user: workosUser, accessToken, refreshToken, organizationId } = authResponse

			// Upsert user (create if doesn't exist, update if exists)
			const user = yield* userRepo.upsertByExternalId({
				externalId: workosUser.id,
				email: workosUser.email,
				firstName: workosUser.firstName || "",
				lastName: workosUser.lastName || "",
				avatarUrl: workosUser.profilePictureUrl || "",
				status: "online" as const,
				lastSeen: new Date(),
				settings: null,
				deletedAt: null,
			}).pipe(Effect.orDie)

			const userId = user.id

			// Create session data
			const sessionData = {
				userId,
				workosUserId: workosUser.id,
				email: workosUser.email,
				organizationId: organizationId || undefined,
				accessToken,
				refreshToken,
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
			}

			// Encrypt session data using JWE
			const secret = new TextEncoder().encode(cookiePassword.padEnd(32, "0").slice(0, 32))
			const encryptedSession = yield* Effect.tryPromise({
				try: async () => {
					return await new jose.EncryptJWT(sessionData)
						.setProtectedHeader({ alg: "dir", enc: "A256GCM" })
						.setIssuedAt()
						.setExpirationTime("7d")
						.encrypt(secret)
				},
				catch: (error) =>
					new InternalServerError({
						message: "Failed to encrypt session",
						detail: String(error),
						cause: error,
					}),
			})

			// Determine redirect URL (could be from state parameter or default)
			const finalRedirectUrl = state ? JSON.parse(state).returnTo as string : "https://app.hazel.sh"

		
			const isSecure = Bun.env.NODE_ENV === "production"

			const cookieOptions = [
				`wos-session=${encryptedSession}`,
				"HttpOnly",
				isSecure ? "Secure" : "",
				"SameSite=Lax",
				"Path=/",
				`Max-Age=${7 * 24 * 60 * 60}`, // 7 days in seconds
			].filter(Boolean).join("; ")

			// Return redirect response with cookie
			return HttpServerResponse.empty({
				status: 302,
				headers: {
					Location: finalRedirectUrl,
					"Set-Cookie": cookieOptions,
				},
			})
		}).pipe(
			Effect.catchTag("NoSuchElementException", (error) =>
				Effect.fail(
					new InternalServerError({
						message: "Configuration error",
						detail: error.message,
						cause: error,
					}),
				),
			),
		),
	)
		
)