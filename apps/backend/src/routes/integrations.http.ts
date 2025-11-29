import { HttpApiBuilder, HttpServerResponse } from "@effect/platform"
import { CurrentUser, InternalServerError, type OrganizationId, UnauthorizedError, type UserId, withSystemActor } from "@hazel/domain"
import {
	ConnectionStatusResponse,
	IntegrationNotConnectedError,
	InvalidOAuthStateError,
} from "@hazel/domain/http"
import { Config, Effect, Option, Schema } from "effect"
import { HazelApi } from "../api"
import { IntegrationConnectionRepo } from "../repositories/integration-connection-repo"
import { OrganizationRepo } from "../repositories/organization-repo"
import { OAuthProviderRegistry } from "../services/oauth"
import { IntegrationTokenService } from "../services/integration-token-service"

/**
 * OAuth state schema - encoded in the state parameter during OAuth flow.
 * Contains context needed to complete the flow after callback.
 */
const OAuthState = Schema.Struct({
	organizationId: Schema.String,
	userId: Schema.String,
	returnTo: Schema.String,
})

export const HttpIntegrationLive = HttpApiBuilder.group(HazelApi, "integrations", (handlers) =>
	handlers
		/**
		 * Get OAuth authorization URL for a provider.
		 * Redirects the user to the provider's OAuth consent page.
		 */
		.handle("getOAuthUrl", ({ path }) =>
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser.Context
				const { provider } = path

				if (!currentUser.organizationId) {
					return yield* Effect.fail(
						new UnauthorizedError({
							message: "Must be in an organization context to connect integrations",
							detail: "No organizationId found in session",
						}),
					)
				}

				// Get the OAuth provider from registry
				const registry = yield* OAuthProviderRegistry
				const oauthProvider = yield* registry.getProvider(provider).pipe(
					Effect.mapError((error) =>
						new InternalServerError({
							message: `Provider not available: ${error._tag}`,
							detail: String(error),
						}),
					),
				)

				const frontendUrl = yield* Config.string("FRONTEND_URL").pipe(Effect.orDie)

				// Get org slug for redirect URL
				const orgRepo = yield* OrganizationRepo
				const orgOption = yield* orgRepo
					.findById(currentUser.organizationId)
					.pipe(
						withSystemActor,
						Effect.mapError(
							(error) =>
								new InternalServerError({
									message: "Failed to fetch organization",
									detail: String(error),
								}),
						),
					)
				const org = yield* Option.match(orgOption, {
					onNone: () =>
						Effect.fail(
							new UnauthorizedError({
								message: "Organization not found",
								detail: `Could not find organization ${currentUser.organizationId}`,
							}),
						),
					onSome: Effect.succeed,
				})

				// Encode state with return URL and context
				const state = encodeURIComponent(
					JSON.stringify({
						organizationId: currentUser.organizationId,
						userId: currentUser.id,
						returnTo: `${frontendUrl}/${org.slug}/settings/integrations`,
					}),
				)

				// Build authorization URL using the provider
				const authorizationUrl = yield* oauthProvider.buildAuthorizationUrl(state)

				return { authorizationUrl: authorizationUrl.toString() }
			}),
		)

		/**
		 * Handle OAuth callback from provider.
		 * Exchanges authorization code for tokens and stores the connection.
		 */
		.handle("oauthCallback", ({ path, urlParams }) =>
			Effect.gen(function* () {
				const { provider } = path
				const { code, state: encodedState } = urlParams

				// Parse and validate state
				const parsedState = yield* Effect.try({
					try: () => Schema.decodeUnknownSync(OAuthState)(JSON.parse(decodeURIComponent(encodedState))),
					catch: () => new InvalidOAuthStateError({ message: "Invalid OAuth state" }),
				})

				// Get the OAuth provider from registry
				const registry = yield* OAuthProviderRegistry
				const oauthProvider = yield* registry.getProvider(provider).pipe(
					Effect.mapError((error) =>
						new InvalidOAuthStateError({
							message: `Provider not available: ${error._tag}`,
						}),
					),
				)

				const connectionRepo = yield* IntegrationConnectionRepo
				const tokenService = yield* IntegrationTokenService

				// Exchange code for tokens using the provider
				const tokens = yield* oauthProvider.exchangeCodeForTokens(code).pipe(
					Effect.mapError((error) =>
						new InvalidOAuthStateError({
							message: error.message,
						}),
					),
				)

				// Get account info from provider
				const accountInfo = yield* oauthProvider.getAccountInfo(tokens.accessToken).pipe(
					Effect.mapError((error) =>
						new InvalidOAuthStateError({
							message: error.message,
						}),
					),
				)

				// Create or update connection
				const connection = yield* connectionRepo
					.upsertByOrgAndProvider({
						provider,
						organizationId: parsedState.organizationId as OrganizationId,
						userId: null, // org-level connection
						level: "organization",
						status: "active",
						externalAccountId: accountInfo.externalAccountId,
						externalAccountName: accountInfo.externalAccountName,
						connectedBy: parsedState.userId as UserId,
						settings: null,
						errorMessage: null,
						lastUsedAt: null,
						deletedAt: null,
					})
					.pipe(withSystemActor)

				// Store encrypted tokens
				yield* tokenService.storeTokens(connection.id, {
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					expiresAt: tokens.expiresAt,
					scope: tokens.scope,
				})

				// Redirect back to the settings page
				return HttpServerResponse.empty({
					status: 302,
					headers: {
						Location: parsedState.returnTo,
					},
				})
			}).pipe(
				Effect.catchTags({
					DatabaseError: (error) =>
						Effect.fail(new InternalServerError({ message: "Database error during OAuth callback", detail: String(error) })),
					ParseError: (error) =>
						Effect.fail(new InvalidOAuthStateError({ message: `Failed to parse response: ${String(error)}` })),
					IntegrationEncryptionError: (error) =>
						Effect.fail(new InternalServerError({ message: "Failed to encrypt tokens", detail: String(error) })),
				}),
			),
		)

		/**
		 * Get connection status for a provider.
		 */
		.handle("getConnectionStatus", ({ path }) =>
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser.Context
				const { provider } = path
				const connectionRepo = yield* IntegrationConnectionRepo

				if (!currentUser.organizationId) {
					return new ConnectionStatusResponse({
						connected: false,
						provider,
						externalAccountName: null,
						status: null,
						connectedAt: null,
						lastUsedAt: null,
					})
				}

				const connectionOption = yield* connectionRepo
					.findByOrgAndProvider(currentUser.organizationId, provider)
					.pipe(withSystemActor)

				if (Option.isNone(connectionOption)) {
					return new ConnectionStatusResponse({
						connected: false,
						provider,
						externalAccountName: null,
						status: null,
						connectedAt: null,
						lastUsedAt: null,
					})
				}

				const connection = connectionOption.value
				return new ConnectionStatusResponse({
					connected: connection.status === "active",
					provider,
					externalAccountName: connection.externalAccountName,
					status: connection.status,
					connectedAt: connection.createdAt ?? null,
					lastUsedAt: connection.lastUsedAt ?? null,
				})
			}).pipe(
				Effect.catchTag("DatabaseError", (error) =>
					Effect.fail(new InternalServerError({ message: "Failed to get connection status", detail: String(error) })),
				),
			),
		)

		/**
		 * Disconnect an integration and revoke tokens.
		 */
		.handle("disconnect", ({ path }) =>
			Effect.gen(function* () {
				const currentUser = yield* CurrentUser.Context
				const { provider } = path
				const connectionRepo = yield* IntegrationConnectionRepo
				const tokenService = yield* IntegrationTokenService

				if (!currentUser.organizationId) {
					return yield* Effect.fail(new IntegrationNotConnectedError({ provider }))
				}

				const connectionOption = yield* connectionRepo
					.findByOrgAndProvider(currentUser.organizationId, provider)
					.pipe(withSystemActor)

				if (Option.isNone(connectionOption)) {
					return yield* Effect.fail(new IntegrationNotConnectedError({ provider }))
				}

				const connection = connectionOption.value

				// Delete tokens first
				yield* tokenService.deleteTokens(connection.id)

				// Soft delete the connection
				yield* connectionRepo.softDelete(connection.id).pipe(withSystemActor)
			}).pipe(
				Effect.catchTag("DatabaseError", (error) =>
					Effect.fail(new InternalServerError({ message: "Failed to disconnect integration", detail: String(error) })),
				),
			),
		),
)
