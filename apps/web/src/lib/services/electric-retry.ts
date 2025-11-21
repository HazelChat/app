import type { ElectricErrorType, ElectricSyncError } from "~/atoms/electric-sync-atoms"
import {
	clearElectricError,
	resetRetryCount,
	setElectricError,
	startRetry,
} from "~/atoms/electric-sync-atoms"

/**
 * Maximum number of retry attempts before giving up
 */
const MAX_RETRIES = 5

/**
 * Base delay for exponential backoff (in milliseconds)
 */
const BASE_DELAY_MS = 1000

/**
 * Maximum delay for exponential backoff (in milliseconds)
 */
const MAX_DELAY_MS = 16000

/**
 * Calculate the next retry delay using exponential backoff
 */
function calculateBackoffDelay(retryCount: number): number {
	const delay = Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS)
	return delay
}

/**
 * Determine the error type from the HTTP status code
 */
function getErrorType(statusCode?: number): ElectricErrorType {
	if (!statusCode) return "unknown"

	if (statusCode === 401 || statusCode === 403) {
		return "auth"
	}

	if (statusCode >= 500 && statusCode < 600) {
		return "network"
	}

	return "unknown"
}

/**
 * Parse the Electric sync error from the error parameters
 */
export function parseElectricError(errorParams: unknown, collectionId: string): ElectricSyncError {
	// Try to extract error details from the error parameters
	let message = "An error occurred while syncing"
	let statusCode: number | undefined

	// Handle different error formats
	if (errorParams && typeof errorParams === "object") {
		// Check if it's an HTTP error with status
		if ("status" in errorParams && typeof errorParams.status === "number") {
			statusCode = errorParams.status
		}

		// Check if it's an HTTP error with statusCode
		if ("statusCode" in errorParams && typeof errorParams.statusCode === "number") {
			statusCode = errorParams.statusCode
		}

		// Try to extract message
		if ("message" in errorParams && typeof errorParams.message === "string") {
			message = errorParams.message
		} else if ("error" in errorParams && typeof errorParams.error === "string") {
			message = errorParams.error
		}
	}

	const type = getErrorType(statusCode)

	return {
		type,
		message,
		statusCode,
		collectionId,
		timestamp: Date.now(),
	}
}

/**
 * Handle Electric sync error with retry logic
 */
export async function handleElectricSyncError(
	error: ElectricSyncError,
	retryCount: number,
	retryFn: () => Promise<void>,
): Promise<void> {
	// Set the error in the atom
	setElectricError(error)

	// Determine if we should retry based on error type and retry count
	const shouldRetry = (error.type === "network" || error.type === "auth") && retryCount < MAX_RETRIES

	if (!shouldRetry) {
		// Don't retry for unknown errors or if max retries exceeded
		console.error(
			`Electric sync failed for collection ${error.collectionId}. Max retries exceeded or non-retriable error.`,
			error,
		)
		return
	}

	// Calculate the next retry delay
	const delay = calculateBackoffDelay(retryCount)
	const nextRetryAt = Date.now() + delay

	// Update the atom to show we're retrying
	startRetry(nextRetryAt)

	// For auth errors, we'll need to attempt token refresh
	// This will be handled by the auth token refresh service
	if (error.type === "auth") {
		console.log(
			`Auth error detected for collection ${error.collectionId}. Attempting token refresh before retry ${retryCount + 1}/${MAX_RETRIES}...`,
		)
	} else {
		console.log(
			`Retrying Electric sync for collection ${error.collectionId} in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
		)
	}

	// Wait for the backoff delay
	await new Promise((resolve) => setTimeout(resolve, delay))

	// Retry the operation
	try {
		await retryFn()
		// Success! Clear the error state
		clearElectricError()
		console.log(`Electric sync recovered for collection ${error.collectionId}`)
	} catch (retryError) {
		// Retry failed, will be handled by the next error handler
		console.error(`Retry failed for collection ${error.collectionId}:`, retryError)
	}
}

/**
 * Manually trigger a retry (useful for user-initiated retries)
 */
export async function manualRetry(retryFn: () => Promise<void>): Promise<boolean> {
	try {
		// Reset retry count for manual retries
		resetRetryCount()

		// Attempt the retry
		await retryFn()

		// Success! Clear the error state
		clearElectricError()
		return true
	} catch (error) {
		console.error("Manual retry failed:", error)
		return false
	}
}
