import { Atom } from "@effect-atom/atom-react"

/**
 * Electric sync error types
 */
export type ElectricErrorType = "auth" | "network" | "unknown"

/**
 * Electric sync status states
 */
export type ElectricSyncState = "connected" | "error" | "retrying"

/**
 * Electric sync error details
 */
export interface ElectricSyncError {
	type: ElectricErrorType
	message: string
	statusCode?: number
	collectionId: string
	timestamp: number
}

/**
 * Electric sync status interface
 */
export interface ElectricSyncStatus {
	state: ElectricSyncState
	error: ElectricSyncError | null
	retryCount: number
	nextRetryAt: number | null
}

/**
 * Atom for managing Electric sync status
 */
export const electricSyncStatusAtom = Atom.make<ElectricSyncStatus>({
	state: "connected" as const,
	error: null,
	retryCount: 0,
	nextRetryAt: null,
}).pipe(Atom.keepAlive)

/**
 * Derived atom that checks if there's an active error
 */
export const hasElectricErrorAtom = Atom.make((get) => {
	const status = get(electricSyncStatusAtom)
	return status.state === "error" || status.state === "retrying"
}).pipe(Atom.keepAlive)

/**
 * Derived atom that checks if currently retrying
 */
export const isRetryingAtom = Atom.make((get) => {
	const status = get(electricSyncStatusAtom)
	return status.state === "retrying"
}).pipe(Atom.keepAlive)

/**
 * Helper function to set an Electric sync error
 */
export const setElectricError = (error: ElectricSyncError) => {
	Atom.batch(() => {
		return Atom.update(electricSyncStatusAtom, (state) => ({
			...state,
			state: "error" as const,
			error,
		}))
	})
}

/**
 * Helper function to start a retry attempt
 */
export const startRetry = (nextRetryAt: number) => {
	Atom.batch(() => {
		return Atom.update(electricSyncStatusAtom, (state) => ({
			...state,
			state: "retrying" as const,
			retryCount: state.retryCount + 1,
			nextRetryAt,
		}))
	})
}

/**
 * Helper function to clear the error and reset to connected state
 */
export const clearElectricError = () => {
	Atom.batch(() => {
		return Atom.set(electricSyncStatusAtom, {
			state: "connected" as const,
			error: null,
			retryCount: 0,
			nextRetryAt: null,
		})
	})
}

/**
 * Helper function to reset retry count (useful when manually retrying)
 */
export const resetRetryCount = () => {
	Atom.batch(() => {
		return Atom.update(electricSyncStatusAtom, (state) => ({
			...state,
			retryCount: 0,
		}))
	})
}
