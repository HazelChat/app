import { Atom, type Result } from "@effect-atom/atom"
import type { Transaction } from "@tanstack/db"
import { createTransaction } from "@tanstack/db"
import { Effect, Exit, type ManagedRuntime } from "effect"
import { OptimisticActionError } from "./errors"

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
