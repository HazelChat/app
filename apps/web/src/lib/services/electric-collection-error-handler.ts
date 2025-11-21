import { handleAuthError } from "./auth-token-refresh"
import { handleElectricSyncError, parseElectricError } from "./electric-retry"

/**
 * Collection registry to track collections for retry
 */
const collectionRegistry = new Map<
	string,
	{
		preload: () => Promise<void>
		retryCount: number
	}
>()

/**
 * Register a collection for error handling and retry
 */
export function registerCollection(collectionId: string, preload: () => Promise<void>) {
	collectionRegistry.set(collectionId, {
		preload,
		retryCount: 0,
	})
}

/**
 * Create an onError handler for a collection
 * This handler will be called when Electric sync fails
 */
export function createCollectionErrorHandler(collectionId: string) {
	return async (errorParams: unknown) => {
		// Parse the error
		const error = parseElectricError(errorParams, collectionId)

		console.error(`Electric sync error for collection ${collectionId}:`, error)

		// Get the collection info
		const collectionInfo = collectionRegistry.get(collectionId)
		if (!collectionInfo) {
			console.error(`Collection ${collectionId} not registered for retry`)
			return
		}

		// For auth errors, verify the session first
		if (error.type === "auth") {
			const canRetry = await handleAuthError()
			if (!canRetry) {
				// Session expired, redirect will happen in handleAuthError
				return
			}
		}

		// Handle the error with retry logic
		await handleElectricSyncError(error, collectionInfo.retryCount, async () => {
			// Increment retry count
			collectionInfo.retryCount++

			// Retry by calling preload again
			await collectionInfo.preload()

			// Reset retry count on success
			collectionInfo.retryCount = 0
		})
	}
}

/**
 * Reset retry count for a collection
 * Useful when user manually triggers retry
 */
export function resetCollectionRetryCount(collectionId: string) {
	const collectionInfo = collectionRegistry.get(collectionId)
	if (collectionInfo) {
		collectionInfo.retryCount = 0
	}
}

/**
 * Reset all retry counts
 * Useful when network comes back online
 */
export function resetAllRetryErrors() {
	for (const collectionInfo of collectionRegistry.values()) {
		collectionInfo.retryCount = 0
	}
}
