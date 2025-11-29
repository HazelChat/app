import { UnsupportedProviderError } from "@hazel/domain/http"
import { Effect } from "effect"
import type { OAuthProvider } from "./oauth-provider"
import { ProviderNotConfiguredError } from "./oauth-provider"
import type { IntegrationProvider, OAuthProviderConfig } from "./provider-config"
import { loadProviderConfig } from "./provider-config"
import { createLinearOAuthProvider } from "./providers/linear-oauth-provider"

/**
 * Factory function type for creating OAuth providers.
 */
type ProviderFactory = (config: OAuthProviderConfig) => OAuthProvider

/**
 * Registry of provider factory functions.
 * Add new providers here when implementing them.
 */
const PROVIDER_FACTORIES: Partial<Record<IntegrationProvider, ProviderFactory>> = {
	linear: createLinearOAuthProvider,
	// Future providers:
	// github: createGitHubOAuthProvider,
	// figma: createFigmaOAuthProvider,
	// notion: createNotionOAuthProvider,
}

/**
 * Providers that are fully implemented and available for use.
 */
const SUPPORTED_PROVIDERS: readonly IntegrationProvider[] = ["linear"] as const

/**
 * OAuth Provider Registry Service.
 *
 * Central service for managing OAuth provider instances. Handles:
 * - Loading provider configuration from environment variables
 * - Creating provider instances with their configuration
 * - Caching provider instances for reuse
 *
 * ## Usage
 *
 * ```typescript
 * const registry = yield* OAuthProviderRegistry
 *
 * // Get a provider for the OAuth flow
 * const provider = yield* registry.getProvider("linear")
 *
 * // Build authorization URL
 * const url = yield* provider.buildAuthorizationUrl(state)
 * ```
 *
 * ## Adding a New Provider
 *
 * 1. Create the provider implementation in `providers/{provider}-oauth-provider.ts`
 * 2. Add factory function to PROVIDER_FACTORIES
 * 3. Add provider to SUPPORTED_PROVIDERS array
 * 4. Set environment variables: {PROVIDER}_CLIENT_ID, {PROVIDER}_CLIENT_SECRET, {PROVIDER}_REDIRECT_URI
 */
export class OAuthProviderRegistry extends Effect.Service<OAuthProviderRegistry>()("OAuthProviderRegistry", {
	accessors: true,
	effect: Effect.gen(function* () {
		// Cache for loaded providers
		const providerCache = new Map<IntegrationProvider, OAuthProvider>()

		/**
		 * Get an OAuth provider instance.
		 * Loads configuration and creates provider on first access, then caches.
		 */
		const getProvider = (
			provider: IntegrationProvider,
		): Effect.Effect<OAuthProvider, UnsupportedProviderError | ProviderNotConfiguredError> =>
			Effect.gen(function* () {
				// Check cache first
				const cached = providerCache.get(provider)
				if (cached) {
					return cached
				}

				// Check if provider is supported
				if (!SUPPORTED_PROVIDERS.includes(provider)) {
					return yield* Effect.fail(
						new UnsupportedProviderError({
							provider,
						}),
					)
				}

				// Get factory function
				const factory = PROVIDER_FACTORIES[provider]
				if (!factory) {
					return yield* Effect.fail(
						new UnsupportedProviderError({
							provider,
						}),
					)
				}

				// Load configuration from environment
				const config = yield* loadProviderConfig(provider).pipe(
					Effect.mapError(
						(error) =>
							new ProviderNotConfiguredError({
								provider,
								message: `Missing configuration for ${provider}: ${String(error)}`,
							}),
					),
				)

				// Create and cache provider
				const oauthProvider = factory(config)
				providerCache.set(provider, oauthProvider)

				return oauthProvider
			})

		/**
		 * List all supported/implemented providers.
		 */
		const listSupportedProviders = (): readonly IntegrationProvider[] => SUPPORTED_PROVIDERS

		/**
		 * Check if a provider is supported.
		 */
		const isProviderSupported = (provider: string): provider is IntegrationProvider =>
			SUPPORTED_PROVIDERS.includes(provider as IntegrationProvider)

		return {
			getProvider,
			listSupportedProviders,
			isProviderSupported,
		}
	}),
}) {}
