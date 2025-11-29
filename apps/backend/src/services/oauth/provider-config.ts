import type { IntegrationConnection } from "@hazel/domain/models"
import { Config, Effect, type Redacted } from "effect"

export type IntegrationProvider = IntegrationConnection.IntegrationProvider

/**
 * Configuration for an OAuth provider.
 * Each provider needs these settings to perform the OAuth flow.
 */
export interface OAuthProviderConfig {
	readonly provider: IntegrationProvider
	readonly clientId: string
	readonly clientSecret: Redacted.Redacted<string>
	readonly redirectUri: string
	readonly authorizationUrl: string
	readonly tokenUrl: string
	readonly scopes: readonly string[]
	readonly scopeDelimiter: string
	readonly additionalAuthParams?: Record<string, string>
}

/**
 * Standard OAuth token response after exchanging authorization code.
 */
export interface OAuthTokens {
	readonly accessToken: string
	readonly refreshToken?: string
	readonly expiresAt?: Date
	readonly scope?: string
	readonly tokenType: string
}

/**
 * Account information retrieved from the provider after authentication.
 */
export interface OAuthAccountInfo {
	readonly externalAccountId: string
	readonly externalAccountName: string
}

/**
 * Provider-specific configuration definitions.
 * These define the OAuth endpoints and settings for each provider.
 */
export const PROVIDER_CONFIGS: Record<
	IntegrationProvider,
	Omit<OAuthProviderConfig, "clientId" | "clientSecret" | "redirectUri">
> = {
	linear: {
		provider: "linear",
		authorizationUrl: "https://linear.app/oauth/authorize",
		tokenUrl: "https://api.linear.app/oauth/token",
		scopes: ["read", "write"],
		scopeDelimiter: ",",
		additionalAuthParams: {
			prompt: "consent",
		},
	},
	github: {
		provider: "github",
		authorizationUrl: "https://github.com/login/oauth/authorize",
		tokenUrl: "https://github.com/login/oauth/access_token",
		scopes: ["read:user", "repo"],
		scopeDelimiter: " ",
	},
	figma: {
		provider: "figma",
		authorizationUrl: "https://www.figma.com/oauth",
		tokenUrl: "https://www.figma.com/api/oauth/token",
		scopes: ["file_read"],
		scopeDelimiter: ",",
	},
	notion: {
		provider: "notion",
		authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
		tokenUrl: "https://api.notion.com/v1/oauth/token",
		scopes: [],
		scopeDelimiter: " ",
		additionalAuthParams: {
			owner: "user",
		},
	},
}

/**
 * Load OAuth configuration for a provider from environment variables.
 *
 * Environment variables:
 * - API_BASE_URL - Base URL for the API (e.g., https://api.hazel.sh or http://localhost:3003)
 * - {PROVIDER}_CLIENT_ID - OAuth client ID
 * - {PROVIDER}_CLIENT_SECRET - OAuth client secret
 *
 * The redirect URI is automatically derived as: {API_BASE_URL}/integrations/{provider}/callback
 *
 * Example for Linear:
 * - API_BASE_URL=https://api.hazel.sh
 * - LINEAR_CLIENT_ID=xxx
 * - LINEAR_CLIENT_SECRET=xxx
 * → Redirect URI: https://api.hazel.sh/integrations/linear/callback
 */
export const loadProviderConfig = (provider: IntegrationProvider) => {
	const prefix = provider.toUpperCase()
	const staticConfig = PROVIDER_CONFIGS[provider]

	return Effect.all({
		apiBaseUrl: Config.string("API_BASE_URL"),
		clientId: Config.string(`${prefix}_CLIENT_ID`),
		clientSecret: Config.redacted(`${prefix}_CLIENT_SECRET`),
	}).pipe(
		Effect.map(
			(envConfig): OAuthProviderConfig => ({
				...staticConfig,
				clientId: envConfig.clientId,
				clientSecret: envConfig.clientSecret,
				redirectUri: `${envConfig.apiBaseUrl}/integrations/${provider}/callback`,
			}),
		),
	)
}
