import {
	type DefinedUseInfiniteQueryResult,
	type InfiniteData,
	type SolidInfiniteQueryOptions,
	useInfiniteQuery as internalUseInfiniteQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import { type FunctionReturnType, getFunctionName } from "convex/server"
import { convexToJson } from "convex/values"
import { createEffect, createMemo, createSignal, on, onCleanup } from "solid-js"
import { type PaginatedQueryArgs, type PaginatedQueryReference, useConvex } from "../convex"

import { makePersisted } from "@solid-primitives/storage"

export interface ConvexPaginatedQueryOptions {
	numItems: number
}

export const convexInfiniteQuery = <Query extends PaginatedQueryReference>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: ConvexPaginatedQueryOptions,
): SolidInfiniteQueryOptions<InfiniteData<FunctionReturnType<Query>, unknown>, Error> => {
	const convex = useConvex()

	const [cursorStore, setCursorStore] = makePersisted(createSignal<string[]>([]), {
		storage: localStorage,
		name: JSON.stringify(args),
	})

	const isDisabled = args === "skip"
	const queryKey = [getFunctionName(query), isDisabled ? {} : JSON.stringify(convexToJson(args as any))]

	const queryOptions: SolidInfiniteQueryOptions<any, Error, any, any, any> = {
		queryKey,
		queryFn: async ({ pageParam = null }) => {
			if (isDisabled) {
				return { page: [], isDone: true, continueCursor: null }
			}

			if (!cursorStore().find((cursor) => cursor === pageParam)) {
				setCursorStore((prev) => [...prev, pageParam === null ? "firstItem" : pageParam])
			}

			const data = await convex.query(query, {
				...(args as object),
				paginationOpts: {
					numItems: options.numItems,
					cursor: pageParam === "firstItem" ? null : pageParam,
				},
			})

			return data
		},

		getNextPageParam: (lastPage) => {
			return lastPage.isDone ? undefined : lastPage.continueCursor
		},
		getPreviousPageParam: (firstPage: any, allPGES: any, pageParam: string) => {
			// TODO: FIXME
			const firstPageCursorIndex = cursorStore().findIndex((cursor) => cursor === pageParam)

			const prevCursor = cursorStore()[firstPageCursorIndex - 1]

			return null
		},

		// maxPages: 3,
		initialPageParam: "firstItem",
		enabled: !isDisabled,
	}

	return queryOptions as any
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

	const queryOptions = convexInfiniteQuery(query, args, options)

	const queryResult = internalUseInfiniteQuery(() => queryOptions as never)

	const pageParamsKey = createMemo(() => JSON.stringify(queryResult.data?.pageParams ?? []))

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
						cursor: pageParam === "firstItem" ? null : pageParam,
					},
				}

				const watch = convex.watchQuery(query, pageArgs as never)

				const unsubscribe = watch.onUpdate(() => {
					const result = watch.localQueryResult()

					// console.debug(
					// 	"[Convex Real-time] Invalidating infinite query:",
					// 	queryOptions.queryKey,
					// 	result,
					// )

					if (result) {
						queryClient.setQueryData(
							queryOptions.queryKey,
							(oldData: {
								pages: any[]
							}) => {
								if (!oldData) return oldData

								const currentPage = oldData.pages[pageIndex]

								if (
									currentPage &&
									currentPage.page?.length === result.page?.length &&
									JSON.stringify(currentPage.page) === JSON.stringify(result.page) &&
									currentPage.continueCursor === result.continueCursor
								) {
									return oldData
								}

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
