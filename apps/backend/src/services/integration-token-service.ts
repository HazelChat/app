import { type IntegrationConnectionId, type IntegrationTokenId, withSystemActor } from "@hazel/domain"
import type { IntegrationConnection } from "@hazel/domain/models"
import { Data, Effect, Option, PartitionedSemaphore, Redacted } from "effect"
import { IntegrationConnectionRepo } from "../repositories/integration-connection-repo"
import { IntegrationTokenRepo } from "../repositories/integration-token-repo"
import { DatabaseLive } from "./database"
import { type EncryptedToken, IntegrationEncryption } from "./integration-encryption"
import { loadProviderConfig } from "./oauth/provider-config"

export class TokenNotFoundError extends Data.TaggedError("TokenNotFoundError")<{
	readonly connectionId: IntegrationConnectionId
}> {}

export class TokenRefreshError extends Data.TaggedError("TokenRefreshError")<{
	readonly provider: IntegrationConnection.IntegrationProvider
	readonly cause: unknown
}> {}

export class ConnectionNotFoundError extends Data.TaggedError("ConnectionNotFoundError")<{
	readonly connectionId: IntegrationConnectionId
}> {}

interface OAuthTokenResponse {
	accessToken: string
	refreshToken?: string
	expiresAt?: Date
	scope?: string
}

// Helper to refresh OAuth tokens for each provider
const refreshOAuthToken = (
	provider: IntegrationConnection.IntegrationProvider,
	refreshToken: string,
	clientId: string,
	clientSecret: string,
): Effect.Effect<OAuthTokenResponse, TokenRefreshError> => {
	const tokenUrls: Record<IntegrationConnection.IntegrationProvider, string> = {
		linear: "https://api.linear.app/oauth/token",
		github: "https://github.com/login/oauth/access_token",
		figma: "https://www.figma.com/api/oauth/refresh",
		notion: "https://api.notion.com/v1/oauth/token",
	}

	return Effect.tryPromise({
		try: async () => {
			const response = await fetch(tokenUrls[provider], {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					client_id: clientId,
					client_secret: clientSecret,
				}),
			})

			if (!response.ok) {
				throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`)
			}

			const data = await response.json()
			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
				scope: data.scope,
			}
		},
		catch: (cause) => new TokenRefreshError({ provider, cause }),
	})
}

export class IntegrationTokenService extends Effect.Service<IntegrationTokenService>()(
	"IntegrationTokenService",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const encryption = yield* IntegrationEncryption
			const tokenRepo = yield* IntegrationTokenRepo
			const connectionRepo = yield* IntegrationConnectionRepo

			// Partitioned semaphore to prevent concurrent token refreshes for the same connection
			const refreshSemaphore = PartitionedSemaphore.makeUnsafe<IntegrationConnectionId>({ permits: 1 })

			/**
			 * Get a valid access token, refreshing if necessary.
			 * Returns the decrypted access token ready for API use.
			 */
			const getValidAccessToken = Effect.fn("IntegrationTokenService.getValidAccessToken")(function* (
				connectionId: IntegrationConnectionId,
			) {
				const tokenOption = yield* tokenRepo.findByConnectionId(connectionId).pipe(withSystemActor)
				const token = yield* Option.match(tokenOption, {
					onNone: () => Effect.fail(new TokenNotFoundError({ connectionId })),
					onSome: Effect.succeed,
				})

				// Check if token is expired or about to expire (10 min buffer)
				const now = Date.now()
				const expiryBuffer = 10 * 60 * 1000 // 10 minutes
				const needsRefresh = token.expiresAt && token.expiresAt.getTime() - now < expiryBuffer

				if (needsRefresh && token.encryptedRefreshToken) {
					// Use partitioned semaphore to prevent concurrent refreshes for the same connection
					// Re-read token inside semaphore to check if another request already refreshed it
					return yield* refreshSemaphore.withPermits(
						connectionId,
						1,
					)(
						Effect.gen(function* () {
							// Re-fetch token to check if it was already refreshed while waiting
							const freshTokenOption = yield* tokenRepo
								.findByConnectionId(connectionId)
								.pipe(withSystemActor)
							const freshToken = yield* Option.match(freshTokenOption, {
								onNone: () => Effect.fail(new TokenNotFoundError({ connectionId })),
								onSome: Effect.succeed,
							})

							const freshNow = Date.now()
							const stillNeedsRefresh =
								freshToken.expiresAt &&
								freshToken.expiresAt.getTime() - freshNow < expiryBuffer

							if (stillNeedsRefresh && freshToken.encryptedRefreshToken) {
								// Still needs refresh - do the actual refresh
								return yield* refreshAndGetToken(connectionId, freshToken)
							}

							// Token was already refreshed by another request - just decrypt and return
							return yield* encryption.decrypt({
								ciphertext: freshToken.encryptedAccessToken,
								iv: freshToken.iv,
								keyVersion: freshToken.encryptionKeyVersion,
							})
						}),
					)
				}

				// Decrypt and return current token
				return yield* encryption.decrypt({
					ciphertext: token.encryptedAccessToken,
					iv: token.iv,
					keyVersion: token.encryptionKeyVersion,
				})
			})

			const refreshAndGetToken = Effect.fn("IntegrationTokenService.refreshAndGetToken")(function* (
				connectionId: IntegrationConnectionId,
				token: {
					id: IntegrationTokenId
					encryptedAccessToken: string
					encryptedRefreshToken: string | null
					iv: string
					refreshTokenIv: string | null
					encryptionKeyVersion: number
				},
			) {
				// Get connection to determine provider
				const connectionOption = yield* connectionRepo.findById(connectionId).pipe(withSystemActor)
				const connection = yield* Option.match(connectionOption, {
					onNone: () => Effect.fail(new ConnectionNotFoundError({ connectionId })),
					onSome: Effect.succeed,
				})

				if (!token.encryptedRefreshToken || !token.refreshTokenIv) {
					return yield* Effect.fail(
						new TokenRefreshError({
							provider: connection.provider,
							cause: "No refresh token available",
						}),
					)
				}

				// Decrypt refresh token using its dedicated IV
				const decryptedRefreshToken = yield* encryption.decrypt({
					ciphertext: token.encryptedRefreshToken,
					iv: token.refreshTokenIv,
					keyVersion: token.encryptionKeyVersion,
				})

				// Load provider config to get client credentials
				const providerConfig = yield* loadProviderConfig(connection.provider).pipe(
					Effect.mapError(
						(cause) =>
							new TokenRefreshError({
								provider: connection.provider,
								cause: `Failed to load provider config: ${cause}`,
							}),
					),
				)

				yield* Effect.logInfo("Refreshing OAuth token", { provider: connection.provider })

				// Call provider's token refresh endpoint
				const newTokens = yield* refreshOAuthToken(
					connection.provider,
					decryptedRefreshToken,
					providerConfig.clientId,
					Redacted.value(providerConfig.clientSecret),
				)

				// Encrypt and store the new tokens
				const encryptedAccess = yield* encryption.encrypt(newTokens.accessToken)
				// Always re-encrypt the refresh token with the current key version to avoid
				// key version mismatch when the provider doesn't return a new refresh token.
				// If provider returned a new refresh token, use it; otherwise re-encrypt the
				// existing decrypted refresh token with the current key.
				const refreshTokenToStore = newTokens.refreshToken ?? decryptedRefreshToken
				const encryptedRefresh = yield* encryption.encrypt(refreshTokenToStore)

				// Update the token in the database
				yield* tokenRepo
					.updateToken(token.id, {
						encryptedAccessToken: encryptedAccess.ciphertext,
						encryptedRefreshToken: encryptedRefresh.ciphertext,
						iv: encryptedAccess.iv,
						refreshTokenIv: encryptedRefresh.iv,
						encryptionKeyVersion: encryptedAccess.keyVersion,
						expiresAt: newTokens.expiresAt ?? null,
						scope: newTokens.scope ?? null,
					})
					.pipe(withSystemActor)

				yield* Effect.logInfo("OAuth token refreshed successfully", { provider: connection.provider })

				// Return the new access token
				return newTokens.accessToken
			})

			/**
			 * Store new tokens after OAuth callback
			 */
			const storeTokens = Effect.fn("IntegrationTokenService.storeTokens")(function* (
				connectionId: IntegrationConnectionId,
				tokens: {
					accessToken: string
					refreshToken?: string
					expiresAt?: Date
					scope?: string
				},
			) {
				// Encrypt tokens
				const encryptedAccess = yield* encryption.encrypt(tokens.accessToken)
				const encryptedRefresh = tokens.refreshToken
					? yield* encryption.encrypt(tokens.refreshToken)
					: null

				// Check if token already exists for this connection
				const existingToken = yield* tokenRepo.findByConnectionId(connectionId).pipe(withSystemActor)

				if (Option.isSome(existingToken)) {
					// Update existing token
					yield* tokenRepo
						.updateToken(existingToken.value.id, {
							encryptedAccessToken: encryptedAccess.ciphertext,
							encryptedRefreshToken: encryptedRefresh?.ciphertext ?? null,
							iv: encryptedAccess.iv,
							refreshTokenIv: encryptedRefresh?.iv ?? null,
							encryptionKeyVersion: encryptedAccess.keyVersion,
							expiresAt: tokens.expiresAt ?? null,
							scope: tokens.scope ?? null,
						})
						.pipe(withSystemActor)
				} else {
					// Create new token
					yield* tokenRepo
						.insert({
							connectionId,
							encryptedAccessToken: encryptedAccess.ciphertext,
							encryptedRefreshToken: encryptedRefresh?.ciphertext ?? null,
							iv: encryptedAccess.iv,
							refreshTokenIv: encryptedRefresh?.iv ?? null,
							encryptionKeyVersion: encryptedAccess.keyVersion,
							tokenType: "Bearer",
							expiresAt: tokens.expiresAt ?? null,
							refreshTokenExpiresAt: null,
							scope: tokens.scope ?? null,
							lastRefreshedAt: null,
						})
						.pipe(withSystemActor)
				}
			})

			/**
			 * Delete tokens for a connection (called when disconnecting)
			 */
			const deleteTokens = Effect.fn("IntegrationTokenService.deleteTokens")(function* (
				connectionId: IntegrationConnectionId,
			) {
				yield* tokenRepo.deleteByConnectionId(connectionId).pipe(withSystemActor)
			})

			return {
				getValidAccessToken,
				storeTokens,
				deleteTokens,
			}
		}),
		dependencies: [
			DatabaseLive,
			IntegrationEncryption.Default,
			IntegrationTokenRepo.Default,
			IntegrationConnectionRepo.Default,
		],
	},
) {}
