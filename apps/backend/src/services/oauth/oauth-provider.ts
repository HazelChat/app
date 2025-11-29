import { Data, Effect } from "effect"
import type { IntegrationProvider, OAuthAccountInfo, OAuthProviderConfig, OAuthTokens } from "./provider-config"

/**
 * Error when exchanging authorization code for tokens fails.
 */
export class TokenExchangeError extends Data.TaggedError("TokenExchangeError")<{
	readonly provider: IntegrationProvider
	readonly message: string
	readonly cause?: unknown
}> {}

/**
 * Error when fetching account info from provider fails.
 */
export class AccountInfoError extends Data.TaggedError("AccountInfoError")<{
	readonly provider: IntegrationProvider
	readonly message: string
	readonly cause?: unknown
}> {}

/**
 * Error when refreshing access token fails.
 */
export class TokenRefreshError extends Data.TaggedError("TokenRefreshError")<{
	readonly provider: IntegrationProvider
	readonly message: string
	readonly cause?: unknown
}> {}

/**
 * Error when provider is not supported or not configured.
 */
export class ProviderNotConfiguredError extends Data.TaggedError("ProviderNotConfiguredError")<{
	readonly provider: IntegrationProvider
	readonly message: string
}> {}

/**
 * Interface for OAuth providers.
 *
 * Each integration provider (Linear, GitHub, Figma, Notion) implements this interface
 * to handle their specific OAuth flow details while maintaining a consistent API.
 *
 * ## Usage Example
 *
 * ```typescript
 * const registry = yield* OAuthProviderRegistry
 * const provider = yield* registry.getProvider("linear")
 *
 * // Get authorization URL
 * const authUrl = yield* provider.buildAuthorizationUrl(state)
 *
 * // After callback, exchange code for tokens
 * const tokens = yield* provider.exchangeCodeForTokens(code)
 *
 * // Get account info
 * const accountInfo = yield* provider.getAccountInfo(tokens.accessToken)
 * ```
 */
export interface OAuthProvider {
	/**
	 * The provider identifier (e.g., "linear", "github").
	 */
	readonly provider: IntegrationProvider

	/**
	 * The provider's configuration including OAuth endpoints.
	 */
	readonly config: OAuthProviderConfig

	/**
	 * Build the OAuth authorization URL for redirecting the user.
	 *
	 * @param state - Encoded state containing organizationId, userId, etc.
	 * @returns Full authorization URL with all required parameters.
	 */
	buildAuthorizationUrl(state: string): Effect.Effect<URL, never>

	/**
	 * Exchange an authorization code for access and refresh tokens.
	 *
	 * @param code - The authorization code from the OAuth callback.
	 * @returns OAuth tokens including access token and optional refresh token.
	 */
	exchangeCodeForTokens(code: string): Effect.Effect<OAuthTokens, TokenExchangeError>

	/**
	 * Fetch account information from the provider's API.
	 *
	 * @param accessToken - Valid access token for API authentication.
	 * @returns Account info with external ID and display name.
	 */
	getAccountInfo(accessToken: string): Effect.Effect<OAuthAccountInfo, AccountInfoError>

	/**
	 * Refresh an expired access token using a refresh token.
	 * Not all providers support refresh tokens.
	 *
	 * @param refreshToken - The refresh token from initial authorization.
	 * @returns New OAuth tokens.
	 */
	refreshAccessToken?(refreshToken: string): Effect.Effect<OAuthTokens, TokenRefreshError>
}

/**
 * Base implementation helper for OAuth providers.
 * Provides common functionality like authorization URL building.
 */
export const createBaseAuthorizationUrl = (config: OAuthProviderConfig, state: string): URL => {
	const url = new URL(config.authorizationUrl)
	url.searchParams.set("client_id", config.clientId)
	url.searchParams.set("redirect_uri", config.redirectUri)
	url.searchParams.set("response_type", "code")
	url.searchParams.set("state", state)

	if (config.scopes.length > 0) {
		url.searchParams.set("scope", config.scopes.join(config.scopeDelimiter))
	}

	if (config.additionalAuthParams) {
		for (const [key, value] of Object.entries(config.additionalAuthParams)) {
			url.searchParams.set(key, value)
		}
	}

	return url
}

/**
 * Helper to make a standard OAuth token exchange request.
 */
export const makeTokenExchangeRequest = (
	config: OAuthProviderConfig,
	code: string,
	clientSecret: string,
): Effect.Effect<OAuthTokens, TokenExchangeError> =>
	Effect.tryPromise({
		try: async () => {
			const response = await fetch(config.tokenUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code,
					redirect_uri: config.redirectUri,
					client_id: config.clientId,
					client_secret: clientSecret,
				}),
			})

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
			}

			const data = await response.json()

			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
				scope: data.scope,
				tokenType: data.token_type || "Bearer",
			} satisfies OAuthTokens
		},
		catch: (error) =>
			new TokenExchangeError({
				provider: config.provider,
				message: `Failed to exchange code for tokens: ${String(error)}`,
				cause: error,
			}),
	})
