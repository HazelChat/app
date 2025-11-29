import { Effect, Redacted } from "effect"
import type { OAuthProviderConfig } from "../provider-config"
import {
	AccountInfoError,
	createBaseAuthorizationUrl,
	makeTokenExchangeRequest,
	type OAuthProvider,
} from "../oauth-provider"

/**
 * Linear OAuth Provider Implementation.
 *
 * Linear uses OAuth 2.0 with the following specifics:
 * - Authorization URL: https://linear.app/oauth/authorize
 * - Token URL: https://api.linear.app/oauth/token
 * - User Info: GraphQL API at https://api.linear.app/graphql
 * - Scopes: read, write (comma-separated)
 * - No refresh tokens (tokens are long-lived)
 *
 * @see https://developers.linear.app/docs/oauth/authentication
 */
export const createLinearOAuthProvider = (config: OAuthProviderConfig): OAuthProvider => ({
	provider: "linear",
	config,

	buildAuthorizationUrl: (state: string) => Effect.succeed(createBaseAuthorizationUrl(config, state)),

	exchangeCodeForTokens: (code: string) =>
		makeTokenExchangeRequest(config, code, Redacted.value(config.clientSecret)),

	getAccountInfo: (accessToken: string) =>
		Effect.tryPromise({
			try: async () => {
				const response = await fetch("https://api.linear.app/graphql", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						query: `
							query {
								viewer {
									id
									name
									email
									organization {
										id
										name
									}
								}
							}
						`,
					}),
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`Linear API request failed: ${response.status} ${errorText}`)
				}

				const result = await response.json()

				if (result.errors) {
					throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
				}

				const viewer = result.data?.viewer
				if (!viewer?.organization) {
					throw new Error("No organization found for Linear user")
				}

				return {
					externalAccountId: viewer.organization.id,
					externalAccountName: viewer.organization.name,
				}
			},
			catch: (error) =>
				new AccountInfoError({
					provider: "linear",
					message: `Failed to get Linear account info: ${String(error)}`,
					cause: error,
				}),
		}),

	// Linear doesn't use refresh tokens - access tokens are long-lived
	// refreshAccessToken is intentionally not implemented
})
