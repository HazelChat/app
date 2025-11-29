import { Atom, type Result } from "@effect-atom/atom"
import type { Collection, Row, Transaction } from "@tanstack/db"
import { createTransaction } from "@tanstack/db"
import type { Txid } from "@tanstack/electric-db-collection"
import { Cause, Effect, Exit, type ManagedRuntime } from "effect"
import { type InvalidTxIdError, OptimisticActionError, SyncError, type TxIdTimeoutError } from "./errors"

/**
 * Parameters passed to the mutationFn
 */
export interface MutationParams<T extends object = Record<string, unknown>> {
	/**
	 * The transaction object tracking this optimistic mutation
	 */
	transaction: Transaction<T>
}

/**
 * Result returned from onMutate callback
 */
export type OptimisticMutateResult = Record<string, unknown>

/**
 * Configuration options for createEffectOptimisticAction
 */
export interface EffectOptimisticActionOptions<
	TVariables,
	TSuccess,
	TError,
	TRequires = never,
	TMutateResult extends OptimisticMutateResult = OptimisticMutateResult,
> {
	/**
	 * Callback executed immediately on mutation to apply optimistic updates
	 * Should insert/update optimistic data into collections
	 * Returns an object with any relevant IDs or metadata
	 */
	onMutate: (variables: TVariables) => TMutateResult

	/**
	 * Effect-based mutation function that performs the actual backend operation
	 * Receives the variables and mutation params (including transaction)
	 * Returns an Effect that yields the success value or fails with typed error
	 */
	mutationFn: (variables: TVariables, params: MutationParams) => Effect.Effect<TSuccess, TError, TRequires>

	/**
	 * ManagedRuntime used to execute the Effect
	 * Should include all required services (R) needed by mutationFn
	 */
	runtime: ManagedRuntime.ManagedRuntime<TRequires, any>

	/**
	 * Optional: Auto-commit the transaction immediately (default: true)
	 * If false, caller must manually commit the transaction
	 */
	autoCommit?: boolean

	/**
	 * Optional: Custom metadata to attach to the transaction
	 */
	metadata?: Record<string, unknown>
}

/**
 * Creates an Effect-based optimistic action that returns an Atom compatible with useAtomSet
 *
 * The returned atom can be used with `useAtomSet(atom, { mode: "promiseExit" })` in React components
 * to perform optimistic mutations with typed error handling via Effect's Exit type.
 *
 * @example
 * ```typescript
 * const sendMessageAction = createEffectOptimisticAction({
 *   onMutate: (props) => {
 *     const messageId = MessageId.make(crypto.randomUUID())
 *     messageCollection.insert({ id: messageId, ...props })
 *     return { messageId }
 *   },
 *   mutationFn: (props, params) => Effect.gen(function* () {
 *     const client = yield* RpcClient
 *     const result = yield* client.message.create(props)
 *     await messageCollection.utils.awaitTxId(result.transactionId)
 *     return result
 *   }),
 *   runtime: runtime
 * })
 *
 * // In component:
 * const sendMessage = useAtomSet(sendMessageAction, { mode: "promiseExit" })
 * const exit = await sendMessage({ content: "Hello" })
 * Exit.match(exit, {
 *   onSuccess: (result) => console.log("Message sent:", result.value),
 *   onFailure: (cause) => console.error("Failed:", cause)
 * })
 * ```
 */
export function createEffectOptimisticAction<
	TVariables,
	TSuccess,
	TError,
	TRequires = never,
	TMutateResult extends OptimisticMutateResult = OptimisticMutateResult,
>(
	options: EffectOptimisticActionOptions<TVariables, TSuccess, TError, TRequires, TMutateResult>,
): Atom.Writable<Result.Result<TSuccess, TError | OptimisticActionError>, TVariables> {
	const { onMutate, mutationFn, runtime, autoCommit = true, metadata } = options

	// Create an Atom that executes the optimistic action when written to
	return Atom.fn((variables: TVariables) =>
		Effect.gen(function* () {
			// Create a transaction that wraps the Effect-based mutationFn
			const transaction = createTransaction({
				autoCommit,
				metadata: metadata,
				mutationFn: async (params) => {
					// Run the Effect-based mutation using the provided runtime
					// Convert Effect to Promise and get Exit to preserve error types
					const exit = await runtime.runPromiseExit(mutationFn(variables, params))

					// If the Effect failed, extract the error and throw it
					// This triggers the transaction rollback
					if (Exit.isFailure(exit)) {
						const cause = exit.cause
						if (cause._tag === "Fail") {
							// Throw the typed error (TError)
							throw cause.error
						}
						// If it's a Die or Interrupt, throw wrapped error
						throw new OptimisticActionError({
							message: "Optimistic action failed unexpectedly",
							cause: cause,
						})
					}

					// Return the success value to the transaction
					return exit.value
				},
			})

			// Execute the optimistic mutation ONCE and capture the result
			// This applies the optimistic updates to collections
			// transaction.mutate() is called synchronously, so mutateResult is guaranteed to be set
			let mutateResult!: TMutateResult
			transaction.mutate(() => {
				mutateResult = onMutate(variables)
			})

			// Update transaction metadata with the mutateResult
			transaction.metadata = { ...metadata, mutateResult }

			// Wait for the transaction to complete and get the result
			// Use Effect.tryPromise to handle potential rejection and rollback
			const result = yield* Effect.tryPromise({
				try: () => transaction.isPersisted.promise,
				catch: (error) => {
					// Attempt rollback on error
					if (transaction.state !== "completed" && transaction.state !== "failed") {
						try {
							transaction.rollback()
						} catch (rollbackError) {
							// Log rollback failure but continue with error propagation
							console.warn("Transaction rollback failed:", rollbackError)
						}
					}

					// If the error is already a typed error, return it
					if (error && typeof error === "object" && "_tag" in error) {
						return error as TError
					}

					// Otherwise wrap in OptimisticActionError
					return new OptimisticActionError({
						message: error instanceof Error ? error.message : "Optimistic action failed",
						cause: error,
					})
				},
			})

			// Return the result (TSuccess) from the mutationFn
			return result as TSuccess
		}),
	)
}

// ============================================================================
// New optimisticAction API with automatic collection sync
// ============================================================================

/**
 * Collection with Effect-native utilities.
 * Uses `any` for row type to allow any collection to be passed.
 * The utils must have awaitTxIdEffect method for sync functionality.
 */
type EffectCollection = Collection<any, any> & {
	utils: {
		awaitTxIdEffect: (
			txid: Txid,
			timeout?: number,
		) => Effect.Effect<boolean, TxIdTimeoutError | InvalidTxIdError>
	}
}

/**
 * Collection input can be single, array, or record
 */
export type CollectionInput = EffectCollection | EffectCollection[] | Record<string, EffectCollection>

/**
 * Normalized collection for internal use
 */
interface NormalizedCollection {
	name: string
	collection: EffectCollection
}

/**
 * Result returned from mutation function
 */
export interface MutationResultWithTxId<TSuccess> {
	data: TSuccess
	transactionId: Txid
}

/**
 * Context passed to mutation function
 */
export interface MutationContext<TMutateResult> {
	mutateResult: TMutateResult
	transaction: Transaction<Record<string, unknown>>
}

/**
 * Result returned from optimistic action
 */
export interface OptimisticActionResult<TSuccess, TMutateResult> {
	data: TSuccess
	mutateResult: TMutateResult
	transactionId: Txid
}

/**
 * Configuration options for optimisticAction
 */
export interface OptimisticActionConfig<
	TVariables,
	TSuccess,
	TError,
	TCollections extends CollectionInput,
	TRequires,
	TMutateResult extends Record<string, unknown>,
> {
	/**
	 * Collections involved - sync happens automatically on ALL of them
	 */
	collections: TCollections

	/**
	 * ManagedRuntime for Effect execution
	 */
	runtime: ManagedRuntime.ManagedRuntime<TRequires, unknown>

	/**
	 * Optimistic mutation - synchronous, returns IDs/metadata
	 */
	onMutate: (variables: TVariables) => TMutateResult

	/**
	 * Server mutation - Effect that returns result with transactionId
	 */
	mutate: (
		variables: TVariables,
		context: MutationContext<TMutateResult>,
	) => Effect.Effect<MutationResultWithTxId<TSuccess>, TError, TRequires>

	/**
	 * Timeout for sync in milliseconds (default 30000ms)
	 */
	syncTimeout?: number
}

/**
 * Normalize collection input to array format
 */
function normalizeCollections(collections: CollectionInput): NormalizedCollection[] {
	// Single collection - check if it looks like a collection
	// biome-ignore lint/suspicious/noExplicitAny: Runtime type check
	if ("state" in collections && typeof (collections as any).insert === "function") {
		return [{ name: "primary", collection: collections as EffectCollection }]
	}

	// Array of collections
	if (Array.isArray(collections)) {
		return collections.map((c, i) => ({ name: `collection_${i}`, collection: c }))
	}

	// Record of collections
	return Object.entries(collections).map(([name, collection]) => ({
		name,
		collection,
	}))
}

/**
 * Sync all collections with transaction ID using pure Effect.
 * Uses Effect.all for parallel execution with full Effect control.
 */
function syncAllCollections(
	collections: NormalizedCollection[],
	txid: Txid,
	timeout: number,
): Effect.Effect<void, SyncError | TxIdTimeoutError | InvalidTxIdError> {
	return Effect.gen(function* () {
		// Create sync effect for each collection
		const syncEffects = collections.map(({ name, collection }) =>
			collection.utils.awaitTxIdEffect(txid, timeout).pipe(
				Effect.mapError(
					(error) =>
						new SyncError({
							message: `Failed to sync collection "${name}"`,
							txid,
							collectionName: name,
							timeout,
							cause: error,
						}),
				),
			),
		)

		// Run all syncs in parallel using Effect.all
		yield* Effect.all(syncEffects, { concurrency: "unbounded" })
	})
}

/**
 * Creates an Effect-based optimistic action with automatic collection sync.
 *
 * Pure Effect implementation - no raw Promises for sync operations.
 * Collections are declared upfront and sync happens automatically on all of them.
 *
 * @example
 * ```typescript
 * // Single collection
 * const sendMessageAction = optimisticAction({
 *   collections: [messageCollection],
 *   runtime: runtime,
 *   onMutate: (props) => {
 *     const messageId = MessageId.make(crypto.randomUUID())
 *     messageCollection.insert({ id: messageId, ...props })
 *     return { messageId }
 *   },
 *   mutate: (props, ctx) => Effect.gen(function* () {
 *     const client = yield* RpcClient
 *     const result = yield* client.message.create(props)
 *     // No manual sync needed! Just return the transactionId
 *     return { data: result, transactionId: result.transactionId }
 *   }),
 * })
 *
 * // Multiple collections
 * const createDmChannel = optimisticAction({
 *   collections: {
 *     channel: channelCollection,
 *     members: channelMemberCollection,
 *   },
 *   runtime: runtime,
 *   onMutate: (props) => {
 *     channelCollection.insert({ ... })
 *     channelMemberCollection.insert({ ... })
 *     return { channelId }
 *   },
 *   mutate: (props, ctx) => Effect.gen(function* () {
 *     const result = yield* client.channel.createDm(props)
 *     // Automatic sync on BOTH channel AND members collections!
 *     return { data: { channelId: result.data.id }, transactionId: result.transactionId }
 *   }),
 * })
 *
 * // In component:
 * const sendMessage = useAtomSet(sendMessageAction, { mode: "promiseExit" })
 * const exit = await sendMessage({ content: "Hello" })
 * Exit.match(exit, {
 *   onSuccess: (result) => console.log("Sent:", result.data),
 *   onFailure: (cause) => console.error("Failed:", cause)
 * })
 * ```
 */
export function optimisticAction<
	TVariables,
	TSuccess,
	TError,
	TCollections extends CollectionInput,
	TRequires = never,
	TMutateResult extends Record<string, unknown> = Record<string, unknown>,
>(
	config: OptimisticActionConfig<TVariables, TSuccess, TError, TCollections, TRequires, TMutateResult>,
): Atom.Writable<
	Result.Result<
		OptimisticActionResult<TSuccess, TMutateResult>,
		TError | SyncError | OptimisticActionError
	>,
	TVariables
> {
	const { collections, runtime, onMutate, mutate, syncTimeout = 30000 } = config
	const normalizedCollections = normalizeCollections(collections)

	return Atom.fn((variables: TVariables) =>
		Effect.gen(function* () {
			let mutateResult!: TMutateResult
			let mutationResult!: MutationResultWithTxId<TSuccess>

			// Create transaction that wraps the Effect-based mutation
			const transaction = createTransaction({
				autoCommit: true,
				mutationFn: async (params) => {
					// Run the mutation Effect
					const mutationEffect = mutate(variables, {
						mutateResult,
						transaction: params.transaction,
					})

					const exit = await runtime.runPromiseExit(mutationEffect)

					if (Exit.isFailure(exit)) {
						const cause = exit.cause
						if (cause._tag === "Fail") {
							throw cause.error // Typed TError
						}
						throw new OptimisticActionError({
							message: "Mutation failed unexpectedly",
							cause: Cause.pretty(cause),
						})
					}

					mutationResult = exit.value

					// Run automatic sync on ALL collections using Effect.all
					const syncEffect = syncAllCollections(
						normalizedCollections,
						mutationResult.transactionId,
						syncTimeout,
					)

					const syncExit = await runtime.runPromiseExit(
						syncEffect as Effect.Effect<
							void,
							SyncError | TxIdTimeoutError | InvalidTxIdError,
							never
						>,
					)

					if (Exit.isFailure(syncExit)) {
						const cause = syncExit.cause
						if (cause._tag === "Fail") {
							throw cause.error // SyncError
						}
						throw new SyncError({
							message: "Sync failed unexpectedly",
							cause: Cause.pretty(cause),
						})
					}

					return mutationResult.data
				},
			})

			// Execute optimistic mutation synchronously
			transaction.mutate(() => {
				mutateResult = onMutate(variables)
			})

			// Wait for transaction completion
			const result = yield* Effect.tryPromise({
				try: () => transaction.isPersisted.promise,
				catch: (error) => {
					// Attempt rollback
					if (transaction.state !== "completed" && transaction.state !== "failed") {
						try {
							transaction.rollback()
						} catch {
							// Ignore rollback errors
						}
					}

					// Preserve typed errors
					if (error && typeof error === "object" && "_tag" in error) {
						return error as TError | SyncError
					}

					return new OptimisticActionError({
						message: error instanceof Error ? error.message : "Optimistic action failed",
						cause: error,
					})
				},
			})

			return {
				data: result as TSuccess,
				mutateResult,
				transactionId: mutationResult.transactionId,
			}
		}),
	)
}
