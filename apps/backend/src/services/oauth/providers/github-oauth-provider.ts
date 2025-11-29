import { Effect, Redacted } from "effect"
import {
	AccountInfoError,
	createBaseAuthorizationUrl,
	type OAuthProvider,
	TokenExchangeError,
} from "../oauth-provider"
import type { OAuthProviderConfig, OAuthTokens } from "../provider-config"

/**
 * GitHub OAuth Provider Implementation.
 *
 * GitHub uses OAuth 2.0 with the following specifics:
 * - Authorization URL: https://github.com/login/oauth/authorize
 * - Token URL: https://github.com/login/oauth/access_token
 * - User Info: REST API at https://api.github.com/user
 * - Scopes: read:user, repo (space-separated)
 * - No refresh tokens (tokens are long-lived until revoked)
 * - Requires Accept: application/json header for token exchange
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */
export const createGitHubOAuthProvider = (config: OAuthProviderConfig): OAuthProvider => ({
	provider: "github",
	config,

	buildAuthorizationUrl: (state: string) => Effect.succeed(createBaseAuthorizationUrl(config, state)),

	exchangeCodeForTokens: (code: string) =>
		Effect.tryPromise({
			try: async () => {
				const response = await fetch(config.tokenUrl, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						client_id: config.clientId,
						client_secret: Redacted.value(config.clientSecret),
						code,
						redirect_uri: config.redirectUri,
					}).toString(),
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`GitHub token exchange failed: ${response.status} ${errorText}`)
				}

				const data = await response.json()

				// GitHub returns error in JSON body, not as HTTP error
				if (data.error) {
					throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
				}

				const tokens: OAuthTokens = {
					accessToken: data.access_token,
					tokenType: data.token_type || "bearer",
					scope: data.scope,
					// GitHub tokens don't expire by default
					expiresAt: undefined,
					refreshToken: undefined,
				}

				return tokens
			},
			catch: (error) =>
				new TokenExchangeError({
					provider: "github",
					message: `Failed to exchange GitHub authorization code: ${String(error)}`,
					cause: error,
				}),
		}),

	getAccountInfo: (accessToken: string) =>
		Effect.tryPromise({
			try: async () => {
				const response = await fetch("https://api.github.com/user", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: "application/vnd.github+json",
						"User-Agent": "Hazel-App",
						"X-GitHub-Api-Version": "2022-11-28",
					},
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`GitHub API request failed: ${response.status} ${errorText}`)
				}

				const user = await response.json()

				if (!user.id || !user.login) {
					throw new Error("Invalid GitHub user response: missing id or login")
				}

				return {
					externalAccountId: String(user.id),
					externalAccountName: user.login,
				}
			},
			catch: (error) =>
				new AccountInfoError({
					provider: "github",
					message: `Failed to get GitHub account info: ${String(error)}`,
					cause: error,
				}),
		}),

	// GitHub doesn't use refresh tokens - access tokens are long-lived until revoked
	// refreshAccessToken is intentionally not implemented
})
