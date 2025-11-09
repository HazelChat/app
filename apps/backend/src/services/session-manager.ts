import {
	CurrentUser,
	OrganizationId,
	UnauthorizedError,
	type UserId,
	withSystemActor,
} from "@hazel/effect-lib"
import { Effect, Option, Schema } from "effect"
import { UserRepo } from "../repositories/user-repo"
import { WorkOS } from "./workos"

/**
 * Type for the WorkOS sealed session object returned from loadSealedSession
 */
type WorkOSSealedSession = {
	authenticate: () => Promise<any>
	refresh: () => Promise<any>
}

/**
 * Represents a successfully authenticated session
 */
export interface AuthenticatedSession {
	readonly user: {
		readonly id: string // WorkOS external ID (not the internal UserId)
		readonly email: string
		readonly firstName: string | null
		readonly lastName: string | null
		readonly profilePictureUrl: string | null
	}
	readonly role: string | null | undefined
	readonly organizationId: OrganizationId | undefined
}

/**
 * Represents a refreshed session with a new sealed session token
 */
export interface RefreshedSession extends AuthenticatedSession {
	readonly sealedSession: string
}

/**
 * Shared session management service that handles authentication,
 * session refresh, and user lookup/upsert logic for both HTTP and RPC middlewares.
 */
export class SessionManager extends Effect.Service<SessionManager>()("SessionManager", {
	accessors: true,
	effect: Effect.gen(function* () {
		const workos = yield* WorkOS
		const userRepo = yield* UserRepo

		/**
		 * Load and authenticate a sealed session from WorkOS.
		 * Returns the authenticated session or attempts to refresh if expired.
		 */
		const authenticateSession = Effect.fn("SessionManager.authenticateSession")(function* (
			sessionCookie: string,
			workOsCookiePassword: string,
		): Generator<any, { res: any; session: any }, any> {
			// Load sealed session from WorkOS
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

			// Try to authenticate the session
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

			return { res, session }
		})

		/**
		 * Refresh an expired session and return the new sealed session token.
		 * This should be called when a session is not authenticated but can be refreshed.
		 */
		const refreshSession = Effect.fn("SessionManager.refreshSession")(function* (
			sealedSession: WorkOSSealedSession,
		): Generator<any, RefreshedSession, any> {
			const refreshedSession: any = yield* Effect.tryPromise(() => sealedSession.refresh()).pipe(
				Effect.tapError((error) => Effect.log("refresh error", error)),
				Effect.catchTag("UnknownException", (error) =>
					Effect.fail(
						new UnauthorizedError({
							message: "Failed to call refresh on sealed session",
							detail: String(error.cause),
						}),
					),
				),
			)

			if (!refreshedSession.authenticated) {
				return yield* Effect.fail(
					new UnauthorizedError({
						message: "Failed to refresh session",
						detail: "The session could not be refreshed",
					}),
				)
			}

			if (!refreshedSession.sealedSession) {
				return yield* Effect.fail(
					new UnauthorizedError({
						message: "Failed to refresh session",
						detail: "No sealed session returned from refresh",
					}),
				)
			}

			// Validate and brand WorkOS organization ID at the boundary
			const organizationId = refreshedSession.organizationId
				? yield* Schema.decodeUnknown(OrganizationId)(refreshedSession.organizationId).pipe(
						Effect.mapError(
							(error) =>
								new UnauthorizedError({
									message: "Invalid organization ID from WorkOS",
									detail: String(error),
								}),
						),
					)
				: undefined

			return {
				user: {
					id: refreshedSession.user.id, // WorkOS external ID (plain string)
					email: refreshedSession.user.email,
					firstName: refreshedSession.user.firstName,
					lastName: refreshedSession.user.lastName,
					profilePictureUrl: refreshedSession.user.profilePictureUrl,
				},
				role: refreshedSession.role,
				organizationId,
				sealedSession: refreshedSession.sealedSession,
			}
		})

		/**
		 * Get or create a user from the database based on WorkOS session data.
		 * This will upsert the user if they don't exist.
		 */
		const getOrCreateUser = Effect.fn("SessionManager.getOrCreateUser")(function* (
			sessionData: AuthenticatedSession,
		) {
			const userOption = yield* userRepo
				.findByExternalId(sessionData.user.id)
				.pipe(Effect.orDie, withSystemActor)

			const user = yield* Option.match(userOption, {
				onNone: () =>
					userRepo
						.upsertByExternalId({
							externalId: sessionData.user.id,
							email: sessionData.user.email,
							firstName: sessionData.user.firstName || "",
							lastName: sessionData.user.lastName || "",
							avatarUrl: sessionData.user.profilePictureUrl || "",
							userType: "user",
							status: "online" as const,
							lastSeen: new Date(),
							settings: null,
							deletedAt: null,
						})
						.pipe(Effect.orDie, withSystemActor),
				onSome: (user) => Effect.succeed(user),
			})

			return user
		})

		/**
		 * Build a CurrentUser schema from session data and database user.
		 */
		const buildCurrentUser = Effect.fn("SessionManager.buildCurrentUser")(function* (
			sessionData: AuthenticatedSession,
			user: {
				id: UserId
				email: string
				firstName: string
				lastName: string
				avatarUrl: string | null
			},
		) {
			return new CurrentUser.Schema({
				id: user.id,
				role: (sessionData.role as "admin" | "member") || "member",
				organizationId: sessionData.organizationId,
				avatarUrl: user.avatarUrl ?? "",
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
			})
		})

		const authenticateAndGetUser = Effect.fn("SessionManager.authenticateAndGetUser")(function* (
			sessionCookie: string,
			workOsCookiePassword: string,
		): Generator<any, { currentUser: CurrentUser.Schema; refreshedSession: string | undefined }, any> {
			yield* Effect.log("Authenticating session")

			const { res, session } = yield* authenticateSession(sessionCookie, workOsCookiePassword)

			if (session.authenticated) {
				const organizationId = session.externalOrganizationId
					? OrganizationId.make(session.externalOrganizationId)
					: undefined

				const sessionData: AuthenticatedSession = {
					user: {
						id: session.user.id,
						email: session.user.email,
						firstName: session.user.firstName,
						lastName: session.user.lastName,
						profilePictureUrl: session.user.profilePictureUrl,
					},
					role: session.role,
					organizationId,
				}

				const user = yield* getOrCreateUser(sessionData)
				const currentUser = yield* buildCurrentUser(sessionData, user)

				return {
					currentUser,
					refreshedSession: undefined,
				}
			}

			// If session explicitly has no cookie, fail immediately
			if (session.reason === "no_session_cookie_provided") {
				return yield* Effect.fail(
					new UnauthorizedError({
						message: "Failed to authenticate session",
						detail: "The session was not authenticated",
					}),
				)
			}

			// Try to refresh the session
			yield* Effect.log("Session not authenticated, attempting refresh")
			const refreshedSession = yield* refreshSession(res)

			const user = yield* getOrCreateUser(refreshedSession)
			const currentUser = yield* buildCurrentUser(refreshedSession, user)

			return {
				currentUser,
				refreshedSession: refreshedSession.sealedSession,
			}
		})

		return {
			authenticateSession,
			refreshSession,
			getOrCreateUser,
			buildCurrentUser,
			authenticateAndGetUser: authenticateAndGetUser as (
				sessionCookie: string,
				workOsCookiePassword: string,
			) => Effect.Effect<
				{ currentUser: CurrentUser.Schema; refreshedSession: string | undefined },
				UnauthorizedError,
				never
			>,
		} as const
	}),
}) {}
