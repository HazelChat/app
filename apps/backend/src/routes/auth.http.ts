import { HttpApiBuilder, HttpServerResponse } from "@effect/platform"
import {
	CurrentUser,
	InternalServerError,
	type OrganizationId,
	UnauthorizedError,
	withSystemActor,
} from "@hazel/domain"
import { Config, Effect, Option, Redacted } from "effect"
import { HazelApi } from "../api"
import { AuthState } from "../lib/schema"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"
import { UserRepo } from "../repositories/user-repo"
import { WorkOS } from "../services/workos"

export const HttpAuthLive = HttpApiBuilder.group(HazelApi, "auth", (handlers) =>
	handlers
		.handle("login", ({ urlParams }) =>
			Effect.gen(function* () {
				const workos = yield* WorkOS

				const clientId = yield* Config.string("WORKOS_CLIENT_ID").pipe(Effect.orDie)
				const redirectUri = yield* Config.string("WORKOS_REDIRECT_URI").pipe(Effect.orDie)

				const state = JSON.stringify(AuthState.make({ returnTo: urlParams.returnTo }))

				let workosOrgId: string

				if (urlParams.organizationId) {
					const workosOrg = yield* workos
						.call(async (client) =>
							client.organizations.getOrganizationByExternalId(urlParams.organizationId!),
						)
						.pipe(
							Effect.catchTag("WorkOSApiError", (error) =>
								Effect.fail(
									new InternalServerError({
										message: "Failed to get organization from WorkOS",
										detail: String(error.cause),
										cause: error,
									}),
								),
							),
						)

					workosOrgId = workosOrg.id
				}

				const authorizationUrl = yield* workos
					.call(async (client) => {
						const authUrl = client.userManagement.getAuthorizationUrl({
							provider: "authkit",
							clientId,
							redirectUri,
							state,
							...(workosOrgId && {
								organizationId: workosOrgId,
							}),
							...(urlParams.invitationToken && { invitationToken: urlParams.invitationToken }),
						})
						return authUrl
					})
					.pipe(
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

				// Return HTTP 302 redirect to WorkOS instead of JSON
				// This eliminates the "Redirecting to login..." intermediate page
				return HttpServerResponse.empty({
					status: 302,
					headers: {
						Location: authorizationUrl,
					},
				})
			}),
		)
		.handle("callback", ({ urlParams }) =>
			Effect.gen(function* () {
				const workos = yield* WorkOS
				const userRepo = yield* UserRepo

				const code = urlParams.code
				const state = AuthState.make(JSON.parse(urlParams.state))

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
				const cookieDomain = yield* Config.string("WORKOS_COOKIE_DOMAIN").pipe(Effect.orDie)

				// Exchange code for user information using WorkOS SDK
				const authResponse = yield* workos
					.call(async (client) => {
						return await client.userManagement.authenticateWithCode({
							clientId,
							code,
							session: {
								sealSession: true,
								cookiePassword: cookiePassword,
							},
						})
					})
					.pipe(
						Effect.catchTag("WorkOSApiError", (error) =>
							Effect.fail(
								new UnauthorizedError({
									message: "Failed to authenticate with WorkOS",
									detail: String(error.cause),
								}),
							),
						),
					)

				const { user: workosUser } = authResponse

				// Upsert the user
				yield* userRepo
					.upsertByExternalId({
						externalId: workosUser.id,
						email: workosUser.email,
						firstName: workosUser.firstName || "",
						lastName: workosUser.lastName || "",
						avatarUrl: workosUser.profilePictureUrl || "",
						userType: "user",
						settings: null,
						isOnboarded: false,
						deletedAt: null,
					})
					.pipe(Effect.orDie, withSystemActor)

				// If auth response includes an organization context, ensure membership exists
				// This handles cases where webhooks are slow to create the membership
				if (authResponse.organizationId) {
					const orgMemberRepo = yield* OrganizationMemberRepo

					// Fetch the internal user (just upserted above)
					const user = yield* userRepo
						.findByExternalId(workosUser.id)
						.pipe(Effect.orDie, withSystemActor)

					// Fetch org by WorkOS org ID to get our internal org ID
					const workosOrg = yield* workos
						.call((client) =>
							client.organizations.getOrganization(authResponse.organizationId!),
						)
						.pipe(Effect.catchAll(() => Effect.succeed(null)))

					if (workosOrg?.externalId && Option.isSome(user)) {
						const orgId = workosOrg.externalId as OrganizationId

						// Check if membership already exists - if so, skip creation
						const existingMembership = yield* orgMemberRepo
							.findByOrgAndUser(orgId, user.value.id)
							.pipe(Effect.orDie, withSystemActor)

						if (Option.isNone(existingMembership)) {
							// Membership doesn't exist - fetch role from WorkOS and create it
							const workosMembership = yield* workos
								.call((client) =>
									client.userManagement.listOrganizationMemberships({
										organizationId: authResponse.organizationId!,
										userId: workosUser.id,
									}),
								)
								.pipe(Effect.catchAll(() => Effect.succeed(null)))

							const role = (workosMembership?.data?.[0]?.role?.slug || "member") as
								| "admin"
								| "member"
								| "owner"

							// Create the membership (only runs if it doesn't exist)
							yield* orgMemberRepo
								.upsertByOrgAndUser({
									organizationId: orgId,
									userId: user.value.id,
									role,
									nickname: null,
									joinedAt: new Date(),
									invitedBy: null,
									deletedAt: null,
								})
								.pipe(Effect.orDie, withSystemActor)
						}
					}
				}

				const isSecure = true // Always use secure cookies with HTTPS proxy

				yield* HttpApiBuilder.securitySetCookie(
					CurrentUser.Cookie,
					Redacted.make(authResponse.sealedSession!),
					{
						secure: isSecure,
						sameSite: "none", // Allow cross-port cookies for localhost dev
						domain: cookieDomain,
						path: "/",
					},
				)

				return HttpServerResponse.empty({
					status: 302,
					headers: {
						Location: state.returnTo,
					},
				})
			}),
		)
		.handle("logout", () =>
			Effect.gen(function* () {
				const workos = yield* WorkOS
				const cookieDomain = yield* Config.string("WORKOS_COOKIE_DOMAIN").pipe(Effect.orDie)

				const logoutUrl = yield* workos.getLogoutUrl().pipe(Effect.orDie)

				yield* HttpApiBuilder.securitySetCookie(CurrentUser.Cookie, Redacted.make(""), {
					secure: true, // Always use secure cookies with HTTPS proxy
					sameSite: "none", // Allow cross-port cookies for localhost dev
					domain: cookieDomain,
					path: "/",
					maxAge: 0,
				})

				return HttpServerResponse.empty({
					status: 302,
					headers: {
						Location: logoutUrl,
					},
				})
			}),
		),
)
