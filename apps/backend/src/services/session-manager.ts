import {
	CurrentUser,
	InvalidBearerTokenError,
	InvalidJwtPayloadError,
	JwtPayload,
	type OrganizationId,
	OrganizationId as OrgId,
	SessionAuthenticationError,
	SessionExpiredError,
	SessionLoadError,
	SessionNotProvidedError,
	SessionRefreshError,
	WorkOSUserFetchError,
	withSystemActor,
} from "@hazel/domain"
import { Config, Effect, Option, Schema } from "effect"
import { TreeFormatter } from "effect/ParseResult"
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose"
import { UserRepo } from "../repositories/user-repo"
import { WorkOS } from "./workos"

/**
 * Session management service that handles authentication via WorkOS.
 * Supports both cookie-based (sealed session) and bearer token (JWT) authentication.
 */
export class SessionManager extends Effect.Service<SessionManager>()("SessionManager", {
	accessors: true,
	effect: Effect.gen(function* () {
		const workos = yield* WorkOS
		const userRepo = yield* UserRepo
		const clientId = yield* Config.string("WORKOS_CLIENT_ID").pipe(Effect.orDie)

		/**
		 * Sync a WorkOS user to the database (find or create).
		 * Private helper used by both auth flows.
		 */
		const syncUserFromWorkOS = function* (
			workOsUserId: string,
			email: string,
			firstName: string | null,
			lastName: string | null,
			avatarUrl: string | null,
		) {
			const userOption = yield* userRepo
				.findByExternalId(workOsUserId)
				.pipe(Effect.orDie, withSystemActor)

			const user = yield* Option.match(userOption, {
				onNone: () =>
					userRepo
						.upsertByExternalId({
							externalId: workOsUserId,
							email: email,
							firstName: firstName || "",
							lastName: lastName || "",
							avatarUrl: avatarUrl || `https://avatar.vercel.sh/${workOsUserId}.svg`,
							userType: "user",
							settings: null,
							isOnboarded: false,
							deletedAt: null,
						})
						.pipe(Effect.orDie, withSystemActor),
				onSome: (user) => Effect.succeed(user),
			})

			return user
		}

		/**
		 * Authenticate with a WorkOS sealed session cookie.
		 * Returns the current user and optionally a new session cookie if refreshed.
		 */
		const authenticateWithCookie = Effect.fn("SessionManager.authenticateWithCookie")(function* (
			sessionCookie: string,
			workOsCookiePassword: string,
		): Generator<any, { currentUser: CurrentUser.Schema; refreshedSession: string | undefined }, any> {
			// Load sealed session from WorkOS
			const sealedSession = yield* workos
				.call(async (client) =>
					client.userManagement.loadSealedSession({
						sessionData: sessionCookie,
						cookiePassword: workOsCookiePassword,
					}),
				)
				.pipe(
					Effect.catchTag("WorkOSApiError", (error) =>
						Effect.fail(
							new SessionLoadError({
								message: "Failed to load session from cookie",
								detail: String(error.cause),
							}),
						),
					),
				)

			// Try to authenticate the session
			const session: any = yield* Effect.tryPromise(() => sealedSession.authenticate()).pipe(
				Effect.catchTag("UnknownException", (error) =>
					Effect.fail(
						new SessionAuthenticationError({
							message: "Failed to authenticate sealed session",
							detail: String(error.cause),
						}),
					),
				),
			)

			// If authenticated, sync user and return
			if (session.authenticated && session.accessToken) {
				// Decode JWT payload
				const jwtPayload = yield* Schema.decodeUnknown(JwtPayload)(
					decodeJwt(session.accessToken),
				).pipe(
					Effect.mapError(
						(error) =>
							new InvalidJwtPayloadError({
								message: "Invalid JWT payload from WorkOS",
								detail: TreeFormatter.formatErrorSync(error),
							}),
					),
				)

				// Sync user to database
				const user = yield* syncUserFromWorkOS(
					session.user.id,
					session.user.email,
					session.user.firstName,
					session.user.lastName,
					session.user.profilePictureUrl,
				)

				// Build CurrentUser
				const currentUser = new CurrentUser.Schema({
					id: user.id,
					role: (session.role as "admin" | "member") || "member",
					organizationId: jwtPayload.externalOrganizationId || undefined,
					avatarUrl: user.avatarUrl,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					isOnboarded: user.isOnboarded,
				})

				yield* Effect.log("🔍 [Cookie Auth] Final CurrentUser:", {
					id: currentUser.id,
					organizationId: currentUser.organizationId,
					role: currentUser.role,
				})

				return { currentUser, refreshedSession: undefined }
			}

			// If not authenticated, check if we should give up
			if (session.reason === "no_session_cookie_provided") {
				return yield* Effect.fail(
					new SessionNotProvidedError({
						message: "No session cookie provided",
						detail: "The session was not authenticated",
					}),
				)
			}

			// Try to refresh the session
			const refreshedSession: any = yield* Effect.tryPromise(() => sealedSession.refresh()).pipe(
				Effect.catchTag("UnknownException", (error) =>
					Effect.fail(
						new SessionRefreshError({
							message: "Failed to refresh sealed session",
							detail: String(error.cause),
						}),
					),
				),
			)

			if (!refreshedSession.authenticated || !refreshedSession.sealedSession) {
				return yield* Effect.fail(
					new SessionExpiredError({
						message: "Failed to refresh session",
						detail: "The session could not be refreshed",
					}),
				)
			}

			// Decode JWT payload from refreshed session
			const jwtPayload = yield* Schema.decodeUnknown(JwtPayload)(
				decodeJwt(refreshedSession.accessToken),
			).pipe(
				Effect.mapError(
					(error) =>
						new InvalidJwtPayloadError({
							message: "Invalid JWT payload from WorkOS",
							detail: TreeFormatter.formatErrorSync(error),
						}),
				),
			)

			// Sync user to database
			const user = yield* syncUserFromWorkOS(
				refreshedSession.user.id,
				refreshedSession.user.email,
				refreshedSession.user.firstName,
				refreshedSession.user.lastName,
				refreshedSession.user.profilePictureUrl,
			)

			// Build CurrentUser
			const currentUser = new CurrentUser.Schema({
				id: user.id,
				role: (refreshedSession.role as "admin" | "member") || "member",
				organizationId: jwtPayload.externalOrganizationId || undefined,
				avatarUrl: user.avatarUrl,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				isOnboarded: user.isOnboarded,
			})

			yield* Effect.log("🔍 [Refresh] Final CurrentUser:", {
				id: currentUser.id,
				organizationId: currentUser.organizationId,
				role: currentUser.role,
			})

			return { currentUser, refreshedSession: refreshedSession.sealedSession }
		})

		/**
		 * Authenticate with a WorkOS bearer token (JWT).
		 * Verifies the JWT signature and syncs the user to the database.
		 */
		const authenticateWithBearer = Effect.fn("SessionManager.authenticateWithBearer")(function* (
			bearerToken: string,
		): Generator<any, CurrentUser.Schema, any> {
			// Verify JWT signature using WorkOS JWKS
			const jwks = createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${clientId}`))

			const { payload } = yield* Effect.tryPromise({
				try: () =>
					jwtVerify(bearerToken, jwks, {
						issuer: "https://api.workos.com",
					}),
				catch: (error) =>
					new InvalidBearerTokenError({
						message: `Invalid token: ${error}`,
						detail: `The provided token is invalid`,
					}),
			})

			const workOsUserId = payload.sub
			if (!workOsUserId) {
				return yield* Effect.fail(
					new InvalidJwtPayloadError({
						message: "Token missing user ID",
						detail: "The provided token is missing the user ID",
					}),
				)
			}

			// Try to find user in DB, if not found fetch from WorkOS and create
			const userOption = yield* userRepo
				.findByExternalId(workOsUserId)
				.pipe(Effect.orDie, withSystemActor)

			const user = yield* Option.match(userOption, {
				onNone: () =>
					Effect.gen(function* () {
						// Fetch user details from WorkOS
						const workosUser = yield* workos
							.call(async (client) => client.userManagement.getUser(workOsUserId))
							.pipe(
								Effect.catchTag("WorkOSApiError", (error) =>
									Effect.fail(
										new WorkOSUserFetchError({
											message: "Failed to fetch user from WorkOS",
											detail: String(error.cause),
										}),
									),
								),
							)

						// Create user in DB
						return yield* syncUserFromWorkOS(
							workosUser.id,
							workosUser.email,
							workosUser.firstName,
							workosUser.lastName,
							workosUser.profilePictureUrl,
						)
					}),
				onSome: (user) => Effect.succeed(user),
			})

			// Build CurrentUser from JWT payload and DB user
			const currentUser = new CurrentUser.Schema({
				id: user.id,
				role: (payload.role as "admin" | "member") || "member",
				organizationId: payload.externalOrganizationId as OrganizationId | undefined,
				avatarUrl: user.avatarUrl,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				isOnboarded: user.isOnboarded,
			})

			return currentUser
		})

		return {
			authenticateWithCookie: authenticateWithCookie as (
				sessionCookie: string,
				workOsCookiePassword: string,
			) => Effect.Effect<
				{ currentUser: CurrentUser.Schema; refreshedSession: string | undefined },
				| SessionLoadError
				| SessionAuthenticationError
				| InvalidJwtPayloadError
				| SessionNotProvidedError
				| SessionRefreshError
				| SessionExpiredError,
				never
			>,
			authenticateWithBearer: authenticateWithBearer as (
				bearerToken: string,
			) => Effect.Effect<
				CurrentUser.Schema,
				InvalidBearerTokenError | InvalidJwtPayloadError | WorkOSUserFetchError,
				never
			>,
			// Keep old method name for backward compatibility during transition
			authenticateAndGetUser: authenticateWithCookie as (
				sessionCookie: string,
				workOsCookiePassword: string,
			) => Effect.Effect<
				{ currentUser: CurrentUser.Schema; refreshedSession: string | undefined },
				| SessionLoadError
				| SessionAuthenticationError
				| InvalidJwtPayloadError
				| SessionNotProvidedError
				| SessionRefreshError
				| SessionExpiredError,
				never
			>,
		} as const
	}),
}) {}
