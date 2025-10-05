import { Data } from "effect"

/**
 * Base error for Electric Collection operations
 */
export class ElectricCollectionError extends Data.TaggedError("ElectricCollectionError")<{
	readonly message: string
	readonly cause?: unknown
}> {}

/**
 * Error thrown when an insert operation fails
 */
export class InsertError extends Data.TaggedError("InsertError")<{
	readonly message: string
	readonly data?: unknown
	readonly cause?: unknown
}> {}

/**
 * Error thrown when an update operation fails
 */
export class UpdateError extends Data.TaggedError("UpdateError")<{
	readonly message: string
	readonly key?: unknown
	readonly cause?: unknown
}> {}

/**
 * Error thrown when a delete operation fails
 */
export class DeleteError extends Data.TaggedError("DeleteError")<{
	readonly message: string
	readonly key?: unknown
	readonly cause?: unknown
}> {}

/**
 * Error thrown when waiting for a transaction ID times out
 */
export class TxIdTimeoutError extends Data.TaggedError("TxIdTimeoutError")<{
	readonly message: string
	readonly txid: number
	readonly timeout: number
}> {}

/**
 * Error thrown when a required transaction ID is missing from handler result
 */
export class MissingTxIdError extends Data.TaggedError("MissingTxIdError")<{
	readonly message: string
	readonly operation: "insert" | "update" | "delete"
}> {}

/**
 * Error thrown when an invalid transaction ID type is provided
 */
export class InvalidTxIdError extends Data.TaggedError("InvalidTxIdError")<{
	readonly message: string
	readonly receivedType: string
}> {}

/**
 * Error thrown when sync configuration is invalid
 */
export class SyncConfigError extends Data.TaggedError("SyncConfigError")<{
	readonly message: string
	readonly cause?: unknown
}> {}
