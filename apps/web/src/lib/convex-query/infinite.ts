import {
	type DefinedUseInfiniteQueryResult,
	type InfiniteData,
	type SolidInfiniteQueryOptions,
	useInfiniteQuery as internalUseInfiniteQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import { type FunctionReturnType, getFunctionName } from "convex/server"
import { convexToJson } from "convex/values"
import { createEffect, createMemo, on, onCleanup } from "solid-js"
import { type PaginatedQueryArgs, type PaginatedQueryReference, useConvex } from "../convex"

export interface ConvexPaginatedQueryOptions {
	numItems: number
}

/**
 * A real-time, paginated query hook for Convex that integrates with TanStack Query.
 *
 * It uses `useInfiniteQuery` for state management and pagination logic,
 * while leveraging `convex.watchQuery` to subscribe to real-time updates.
 *
 * @param query - The Convex paginated query reference (e.g., `api.messages.list`).
 * @param args - The arguments for the query, or "skip" to disable.
 * @param options - Pagination options, like the number of items per page.
 * @returns The result of a `useInfiniteQuery` call, with real-time updates.
 */
export function useConvexInfiniteQuery<Query extends PaginatedQueryReference>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: ConvexPaginatedQueryOptions,
): DefinedUseInfiniteQueryResult<InfiniteData<FunctionReturnType<Query>, unknown>, Error> {
	const convex = useConvex()
	const queryClient = useQueryClient()
	const isDisabled = args === "skip"

	const queryKey = [getFunctionName(query), isDisabled ? {} : JSON.stringify(convexToJson(args as any))]

	const queryOptions: SolidInfiniteQueryOptions<any, Error, any, any, any> = {
		queryKey,
		queryFn: async ({ pageParam = null }) => {
			if (isDisabled) {
				return { page: [], isDone: true, continueCursor: null }
			}
			return await convex.query(query, {
				...(args as object),
				paginationOpts: {
					numItems: options.numItems,
					cursor: pageParam,
				},
			})
		},

		getNextPageParam: (lastPage) => {
			return lastPage.isDone ? undefined : lastPage.continueCursor
		},
		// select: (data) => ({
		// 	pages: [...data.pages].reverse(),
		// 	pageParams: [...data.pageParams].reverse(),
		// }),
		initialPageParam: null,
		enabled: !isDisabled,
	}

	const queryResult = internalUseInfiniteQuery(() => queryOptions as never)

	// Create a memo that only changes when the page structure changes.
	// This is the key to breaking the infinite loop.
	const pageParamsKey = createMemo(() => JSON.stringify(queryResult.data?.pageParams ?? []))

	// Use `on(pageParamsKey, ...)` to explicitly track only the page structure.
	createEffect(
		on(pageParamsKey, () => {
			if (isDisabled || !queryResult.data) {
				return
			}

			// This logic now only runs when a new page is added or the query is reset.
			// It will NOT run on a simple content update.
			const unsubscribes = queryResult.data.pageParams.map((pageParam, pageIndex) => {
				const pageArgs = {
					...(args as object),
					paginationOpts: {
						numItems: options.numItems,
						cursor: pageParam,
					},
				}

				const watch = convex.watchQuery(query, pageArgs as never)

				const unsubscribe = watch.onUpdate(() => {
					const result = watch.localQueryResult()

					console.debug("[Convex Real-time] Invalidating infinite query:", queryKey, result)

					if (result) {
						queryClient.setQueryData(
							queryKey,
							(oldData: {
								pages: any[]
							}) => {
								if (!oldData) return oldData

								const currentPage = oldData.pages[pageIndex]

								// Compare just the page data (adjust based on your needs)
								if (
									currentPage &&
									currentPage.page?.length === result.page?.length &&
									JSON.stringify(currentPage.page) === JSON.stringify(result.page) &&
									currentPage.continueCursor === result.continueCursor
								) {
									// No actual change, preserve reference
									return oldData
								}

								// Data changed, create new array
								const newPages = [...oldData.pages]
								newPages[pageIndex] = result

								return {
									...oldData,
									pages: newPages,
								}
							},
						)
					}
				})

				return unsubscribe
			})

			onCleanup(() => {
				// biome-ignore lint/complexity/noForEach: <explanation>
				unsubscribes.forEach((unsubscribe) => unsubscribe())
			})
		}),
	)

	return queryResult as any
}
