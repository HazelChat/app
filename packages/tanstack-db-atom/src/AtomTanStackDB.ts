/**
 * TanStack DB utilities for Effect Atom
 * Provides reactive atoms that integrate with TanStack DB collections and queries
 * @since 1.0.0
 */

import { Atom, Result } from "@effect-atom/atom-react"
import {
	type Collection,
	type Context,
	createLiveQueryCollection,
	type GetResult,
	type InferResultType,
	type InitialQueryBuilder,
	type NonSingleResult,
	type QueryBuilder,
	type SingleResult,
} from "@tanstack/db"
import { constUndefined } from "effect/Function"
import type { CollectionStatus, ConditionalQueryFn, QueryFn, QueryOptions } from "./types"

/**
 * Utility functions for creating Effect Atoms from TanStack DB collections and queries
 *
 * @example
 * ```typescript
 * // Create an atom from a query
 * const todosAtom = makeQuery((q) =>
 *   q.from({ todos: todoCollection })
 *    .where(({ todos }) => eq(todos.completed, false))
 * )
 *
 * // Use in React
 * const todos = useAtom(todosAtom)
 * ```
 */

/**
 * Creates an Atom from a TanStack DB collection
 * Returns a Result that tracks the collection's lifecycle state
 *
 * @param collection - TanStack DB collection to wrap
 * @returns Atom that emits Result<Array<T>>
 *
 * @example
 * ```typescript
 * const todosAtom = makeCollectionAtom(todosCollection)
 * const result = useAtom(todosAtom)
 *
 * Result.match(result, {
 *   onWaiting: () => <Loading />,
 *   onFailure: (error) => <Error error={error} />,
 *   onSuccess: (todos) => <TodoList todos={todos} />
 * })
 * ```
 */
export const makeCollectionAtom = <T extends object, TKey extends string | number>(
	collection: Collection<T, TKey, any> & NonSingleResult,
): Atom.Atom<Result.Result<Array<T>, Error>> => {
	return Atom.readable((get) => {
		// Start sync if not already started
		collection.startSyncImmediate()

		// Set up subscription immediately, before checking initial status
		// This ensures we get notified when async sync completes
		const subscription = collection.subscribeChanges(() => {
			const status: CollectionStatus = collection.status

			if (status === "error") {
				get.setSelf(Result.fail(new Error("Collection failed to load")))
				return
			}

			if (status === "loading" || status === "idle") {
				get.setSelf(Result.initial(true))
				return
			}

			if (status === "cleaned-up") {
				get.setSelf(Result.fail(new Error("Collection has been cleaned up")))
				return
			}

			const newData = Array.from(collection.entries()).map(([_, value]) => value)
			get.setSelf(Result.success(newData))
		})

		// Cleanup on unmount
		get.addFinalizer(() => {
			subscription.unsubscribe()
		})

		// Return initial state based on current status
		const status: CollectionStatus = collection.status

		if (status === "error") {
			return Result.fail(new Error("Collection failed to load"))
		}

		if (status === "loading" || status === "idle") {
			return Result.initial(true)
		}

		if (status === "cleaned-up") {
			return Result.fail(new Error("Collection has been cleaned up"))
		}

		// Get current data
		const initialData = Array.from(collection.entries()).map(([_, value]) => value)

		return Result.success(initialData)
	})
}

/**
 * Creates an Atom from a TanStack DB collection with single result
 * Returns a Result that contains a single item or undefined
 *
 * @param collection - TanStack DB collection with singleResult: true
 * @returns Atom that emits Result<T | undefined>
 *
 * @example
 * ```typescript
 * const currentUserAtom = makeSingleCollectionAtom(currentUserCollection)
 * const result = useAtom(currentUserAtom)
 * ```
 */
export const makeSingleCollectionAtom = <T extends object, TKey extends string | number>(
	collection: Collection<T, TKey, any> & SingleResult,
): Atom.Atom<Result.Result<T | undefined, Error>> => {
	return Atom.readable((get) => {
		// Start sync if not already started
		collection.startSyncImmediate()

		// Set up subscription immediately, before checking initial status
		// This ensures we get notified when async sync completes
		const subscription = collection.subscribeChanges(() => {
			const status: CollectionStatus = collection.status

			if (status === "error") {
				get.setSelf(Result.fail(new Error("Collection failed to load")))
				return
			}

			if (status === "loading" || status === "idle") {
				get.setSelf(Result.initial(true))
				return
			}

			if (status === "cleaned-up") {
				get.setSelf(Result.fail(new Error("Collection has been cleaned up")))
				return
			}

			const entries = Array.from(collection.entries())
			const newData = entries.length > 0 ? entries[0]![1] : undefined
			get.setSelf(Result.success(newData))
		})

		// Cleanup on unmount
		get.addFinalizer(() => {
			subscription.unsubscribe()
		})

		// Return initial state based on current status
		const status: CollectionStatus = collection.status

		if (status === "error") {
			return Result.fail(new Error("Collection failed to load"))
		}

		if (status === "loading" || status === "idle") {
			return Result.initial(true)
		}

		if (status === "cleaned-up") {
			return Result.fail(new Error("Collection has been cleaned up"))
		}

		// Get current data (single result)
		const entries = Array.from(collection.entries())
		const initialData = entries.length > 0 ? entries[0]![1] : undefined

		return Result.success(initialData)
	})
}

/**
 * Creates an Atom from a TanStack DB query function
 * Automatically creates a live query collection and manages its lifecycle
 *
 * @param queryFn - Query builder function
 * @param options - Optional configuration
 * @returns Atom that emits Result<InferResultType<TContext>>
 *
 * @example
 * ```typescript
 * const activeTodosAtom = makeQuery((q) =>
 *   q.from({ todos: todosCollection })
 *    .where(({ todos }) => eq(todos.completed, false))
 *    .select(({ todos }) => ({ id: todos.id, text: todos.text }))
 * )
 * ```
 */
export const makeQuery = <TContext extends Context>(
	queryFn: QueryFn<TContext>,
	options?: QueryOptions,
): Atom.Atom<Result.Result<InferResultType<TContext>, Error>> => {
	return Atom.readable((get) => {
		// Create live query collection
		const collection = createLiveQueryCollection({
			query: queryFn,
			startSync: options?.startSync ?? true,
			gcTime: options?.gcTime ?? 0, // Let atom lifecycle manage GC by default
		})

		// Set up subscription immediately, before checking initial status
		// This ensures we get notified when async sync completes
		const subscription = collection.subscribeChanges(() => {
			const status: CollectionStatus = collection.status

			if (status === "error") {
				get.setSelf(Result.fail(new Error("Query failed to load")))
				return
			}

			if (status === "loading" || status === "idle") {
				get.setSelf(Result.initial(true))
				return
			}

			if (status === "cleaned-up") {
				get.setSelf(Result.fail(new Error("Query collection has been cleaned up")))
				return
			}

			// Get current data - handle both single and array results
			const isSingleResult = (collection as any).config?.singleResult === true
			const entries = Array.from(collection.entries()).map(([_, value]) => value)
			const newData = (isSingleResult ? entries[0] : entries) as InferResultType<TContext>
			get.setSelf(Result.success(newData))
		})

		// Cleanup on unmount
		get.addFinalizer(() => {
			subscription.unsubscribe()
		})

		// Return initial state based on current status
		const status: CollectionStatus = collection.status

		if (status === "error") {
			return Result.fail(new Error("Query failed to load"))
		}

		if (status === "loading" || status === "idle") {
			return Result.initial(true)
		}

		if (status === "cleaned-up") {
			return Result.fail(new Error("Query collection has been cleaned up"))
		}

		// Get current data - handle both single and array results
		const isSingleResult = (collection as any).config?.singleResult === true
		const entries = Array.from(collection.entries()).map(([_, value]) => value)
		const initialData = (isSingleResult ? entries[0] : entries) as InferResultType<TContext>

		return Result.success(initialData)
	})
}

/**
 * Creates an Atom from a TanStack DB query function (unsafe version)
 * Returns undefined instead of Result for simpler usage when you don't need error handling
 *
 * @param queryFn - Query builder function
 * @param options - Optional configuration
 * @returns Atom that emits InferResultType<TContext> | undefined
 *
 * @example
 * ```typescript
 * const todosAtom = makeQueryUnsafe((q) =>
 *   q.from({ todos: todosCollection })
 * )
 *
 * const todos = useAtom(todosAtom) // Array<Todo> | undefined
 * ```
 */
export const makeQueryUnsafe = <TContext extends Context>(
	queryFn: QueryFn<TContext>,
	options?: QueryOptions,
): Atom.Atom<InferResultType<TContext> | undefined> => {
	return Atom.readable((get) => {
		const result = get(makeQuery(queryFn, options))
		return Result.getOrElse(result, constUndefined) as InferResultType<TContext> | undefined
	})
}

/**
 * Creates an Atom from a conditional TanStack DB query function
 * The query function can return null/undefined to disable the query
 *
 * @param queryFn - Conditional query builder function
 * @param options - Optional configuration
 * @returns Atom that emits Result<InferResultType<TContext>> | undefined
 *
 * @example
 * ```typescript
 * const userTodosAtom = makeQueryConditional((q) => {
 *   const userId = getCurrentUserId()
 *   if (!userId) return null
 *
 *   return q.from({ todos: todosCollection })
 *           .where(({ todos }) => eq(todos.userId, userId))
 * })
 * ```
 */
export const makeQueryConditional = <TContext extends Context>(
	queryFn: ConditionalQueryFn<TContext>,
	options?: QueryOptions,
): Atom.Atom<Result.Result<InferResultType<TContext>, Error> | undefined> => {
	return Atom.readable((get) => {
		// Build query to check if it returns null/undefined
		const query = queryFn({} as InitialQueryBuilder)

		if (query === null || query === undefined) {
			return undefined
		}

		// Otherwise create the query atom
		return get(makeQuery(queryFn as QueryFn<TContext>, options))
	})
}
