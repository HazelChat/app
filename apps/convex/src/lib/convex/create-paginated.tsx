import type { OptimisticLocalStore } from "convex/browser"
import {
	type BetterOmit,
	type Expand,
	type FunctionReturnType,
	type PaginationOptions,
	type PaginationResult,
	getFunctionName,
} from "convex/server"
import type { FunctionArgs, FunctionReference } from "convex/server"
import { ConvexError, type Infer, type Value, convexToJson } from "convex/values"
import { compareValues } from "convex/values"
import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { useConvex } from "./client"

export type PaginatedQueryReference = FunctionReference<
	"query",
	"public",
	{ paginationOpts: PaginationOptions },
	PaginationResult<any>
>

type QueryPageKey = number

type PaginatedQueryState = {
	query: FunctionReference<"query">
	args: Record<string, Value>
	id: number
	nextPageKey: QueryPageKey
	pageKeys: QueryPageKey[]
	queries: Record<
		QueryPageKey,
		{
			query: FunctionReference<"query">
			args: { paginationOpts: Infer<typeof import("convex/server").paginationOptsValidator> }
		}
	>
	ongoingSplits: Record<QueryPageKey, [QueryPageKey, QueryPageKey]>
	skip: boolean
}

export type CreatePaginatedQueryResult<Item> = {
	results: Accessor<Item[]>
	loadMore: (numItems: number) => void
} & (
	| {
			status: Accessor<"LoadingFirstPage">
			isLoading: Accessor<true>
	  }
	| {
			status: Accessor<"CanLoadMore">
			isLoading: Accessor<false>
	  }
	| {
			status: Accessor<"LoadingMore">
			isLoading: Accessor<true>
	  }
	| {
			status: Accessor<"Exhausted">
			isLoading: Accessor<false>
	  }
)

export type PaginationStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"

export type PaginatedQueryArgs<Query extends PaginatedQueryReference> = Expand<
	BetterOmit<FunctionArgs<Query>, "paginationOpts">
>

export type PaginatedQueryItem<Query extends PaginatedQueryReference> = FunctionReturnType<Query>["page"][number]

export type CreatePaginatedQueryReturnType<Query extends PaginatedQueryReference> = CreatePaginatedQueryResult<
	PaginatedQueryItem<Query>
>

let paginationId = 0

function nextPaginationId(): number {
	paginationId++
	return paginationId
}

export function resetPaginationId() {
	paginationId = 0
}

export function createPaginatedQuery<Query extends PaginatedQueryReference>(
	query: Query,
	args: PaginatedQueryArgs<Query> | "skip",
	options: { initialNumItems: number },
): CreatePaginatedQueryReturnType<Query> {
	if (typeof options?.initialNumItems !== "number" || options.initialNumItems < 0) {
		throw new Error(
			`\`options.initialNumItems\` must be a positive number. Received \`${options?.initialNumItems}\`.`,
		)
	}

	const skip = args === "skip"
	const argsObject = skip ? {} : args
	const convexClient = useConvex()

	// @ts-expect-error Internal API
	const logger = convexClient.logger

	const createInitialState = (): PaginatedQueryState => {
		const id = nextPaginationId()
		return {
			query,
			args: argsObject as Record<string, Value>,
			id,
			nextPageKey: 1,
			pageKeys: skip ? [] : [0],
			queries: skip
				? ({} as PaginatedQueryState["queries"])
				: {
						0: {
							query,
							args: {
								...argsObject,
								paginationOpts: {
									numItems: options.initialNumItems,
									cursor: null,
									id,
								},
							},
						},
					},
			ongoingSplits: {},
			skip,
		}
	}

	const [state, setState] = createSignal<PaginatedQueryState>(createInitialState())

	const memoizedArgsKey = createMemo(() => JSON.stringify(convexToJson(argsObject as Value)))

	const currentState = createMemo(() => {
		const currentState = state()
		const currentArgsKey = memoizedArgsKey()

		if (
			getFunctionName(query) !== getFunctionName(currentState.query) ||
			currentArgsKey !== JSON.stringify(convexToJson(currentState.args)) ||
			skip !== currentState.skip
		) {
			const newState = createInitialState()
			setState(newState)
			return newState
		}
		return currentState
	})

	const [queryResults, setQueryResults] = createStore<Record<QueryPageKey, any>>({})

	createEffect(() => {
		const currState = currentState()
		const watchers: (() => void)[] = []

		setQueryResults({})

		// biome-ignore lint/complexity/noForEach: <explanation>
		Object.entries(currState.queries).forEach(([pageKeyStr, queryDef]) => {
			const pageKey = Number.parseInt(pageKeyStr)
			const watch = convexClient.watchQuery(queryDef.query, queryDef.args)

			const existingResult = watch.localQueryResult()
			if (existingResult !== undefined) {
				setQueryResults(pageKey, existingResult)
			}

			const unsubscribe = watch.onUpdate(() => {
				try {
					const result = watch.localQueryResult()
					setQueryResults(pageKey, result)
				} catch (error) {
					setQueryResults(pageKey, error)
				}
			})

			watchers.push(unsubscribe)
		})

		onCleanup(() => {
			// biome-ignore lint/complexity/noForEach: <explanation>
			watchers.forEach((unsubscribe) => unsubscribe())
		})
	})

	const splitQuery = (key: QueryPageKey, splitCursor: string, continueCursor: string) => {
		setState((prevState) => {
			const queries = { ...prevState.queries }
			const splitKey1 = prevState.nextPageKey
			const splitKey2 = prevState.nextPageKey + 1
			const nextPageKey = prevState.nextPageKey + 2

			queries[splitKey1] = {
				query: prevState.query,
				args: {
					...prevState.args,
					paginationOpts: {
						...prevState.queries[key].args.paginationOpts,
						endCursor: splitCursor,
					},
				},
			}
			queries[splitKey2] = {
				query: prevState.query,
				args: {
					...prevState.args,
					paginationOpts: {
						...prevState.queries[key].args.paginationOpts,
						cursor: splitCursor,
						endCursor: continueCursor,
					},
				},
			}

			const ongoingSplits = { ...prevState.ongoingSplits }
			ongoingSplits[key] = [splitKey1, splitKey2]

			return {
				...prevState,
				nextPageKey,
				queries,
				ongoingSplits,
			}
		})
	}

	const completeSplitQuery = (key: QueryPageKey) => {
		setState((prevState) => {
			const completedSplit = prevState.ongoingSplits[key]
			if (completedSplit === undefined) {
				return prevState
			}

			const queries = { ...prevState.queries }
			delete queries[key]

			const ongoingSplits = { ...prevState.ongoingSplits }
			delete ongoingSplits[key]

			let pageKeys = prevState.pageKeys.slice()
			const pageIndex = prevState.pageKeys.findIndex((v) => v === key)
			if (pageIndex >= 0) {
				pageKeys = [
					...prevState.pageKeys.slice(0, pageIndex),
					...completedSplit,
					...prevState.pageKeys.slice(pageIndex + 1),
				]
			}

			return {
				...prevState,
				queries,
				pageKeys,
				ongoingSplits,
			}
		})
	}

	const results = createMemo(() => {
		const currState = currentState()
		let currResult = undefined

		const allItems = []
		for (const pageKey of currState.pageKeys) {
			currResult = queryResults[pageKey]
			if (currResult === undefined) {
				break
			}

			if (currResult instanceof Error) {
				if (
					currResult.message.includes("InvalidCursor") ||
					(currResult instanceof ConvexError &&
						typeof currResult.data === "object" &&
						currResult.data?.isConvexSystemError === true &&
						currResult.data?.paginationError === "InvalidCursor")
				) {
					logger.warn(`createPaginatedQuery hit error, resetting pagination state: ${currResult.message}`)
					setState(createInitialState())
					return [[], undefined]
				}
				throw currResult
			}

			const ongoingSplit = currState.ongoingSplits[pageKey]
			if (ongoingSplit !== undefined) {
				if (queryResults[ongoingSplit[0]] !== undefined && queryResults[ongoingSplit[1]] !== undefined) {
					completeSplitQuery(pageKey)
				}
			} else if (
				currResult.splitCursor &&
				(currResult.pageStatus === "SplitRecommended" ||
					currResult.pageStatus === "SplitRequired" ||
					currResult.page.length > options.initialNumItems * 2)
			) {
				splitQuery(pageKey, currResult.splitCursor, currResult.continueCursor)
			}

			if (currResult.pageStatus === "SplitRequired") {
				return [allItems, undefined]
			}

			allItems.push(...currResult.page)
		}
		return [allItems, currResult]
	})

	const status = createMemo((): PaginationStatus => {
		const [, lastResult] = results()
		const currState = currentState()

		if (lastResult === undefined) {
			if (currState.nextPageKey === 1) {
				return "LoadingFirstPage"
			}
			return "LoadingMore"
		}
		if (lastResult.isDone) {
			return "Exhausted"
		}
		return "CanLoadMore"
	})

	const isLoading = createMemo(() => {
		const currentStatus = status()
		return currentStatus === "LoadingFirstPage" || currentStatus === "LoadingMore"
	})

	let alreadyLoadingMore = false

	const loadMore = (numItems: number) => {
		const [, lastResult] = results()
		const currentStatus = status()

		if (currentStatus !== "CanLoadMore" || !lastResult || alreadyLoadingMore) {
			return
		}

		alreadyLoadingMore = true
		const continueCursor = lastResult.continueCursor

		setState((prevState) => {
			const pageKeys = [...prevState.pageKeys, prevState.nextPageKey]
			const queries = { ...prevState.queries }
			queries[prevState.nextPageKey] = {
				query: prevState.query,
				args: {
					...prevState.args,
					paginationOpts: {
						numItems,
						cursor: continueCursor,
						id: prevState.id,
					},
				},
			}
			return {
				...prevState,
				nextPageKey: prevState.nextPageKey + 1,
				pageKeys,
				queries,
			}
		})

		setTimeout(() => {
			alreadyLoadingMore = false
		}, 0)
	}

	return {
		results: () => results()[0],
		status,
		isLoading,
		loadMore,
	} as CreatePaginatedQueryReturnType<Query>
}

export function optimisticallyUpdateValueInPaginatedQuery<Query extends PaginatedQueryReference>(
	localStore: OptimisticLocalStore,
	query: Query,
	args: PaginatedQueryArgs<Query>,
	updateValue: (currentValue: PaginatedQueryItem<Query>) => PaginatedQueryItem<Query>,
): void {
	const expectedArgs = JSON.stringify(convexToJson(args as Value))

	for (const queryResult of localStore.getAllQueries(query)) {
		if (queryResult.value !== undefined) {
			const { paginationOpts: _, ...innerArgs } = queryResult.args as {
				paginationOpts: PaginationOptions
			}
			if (JSON.stringify(convexToJson(innerArgs as Value)) === expectedArgs) {
				const value = queryResult.value
				if (typeof value === "object" && value !== null && Array.isArray(value.page)) {
					localStore.setQuery(query, queryResult.args, {
						...value,
						page: value.page.map(updateValue),
					})
				}
			}
		}
	}
}

export function insertAtTop<Query extends PaginatedQueryReference>(options: {
	paginatedQuery: Query
	argsToMatch?: Partial<PaginatedQueryArgs<Query>>
	localQueryStore: OptimisticLocalStore
	item: PaginatedQueryItem<Query>
}) {
	const { paginatedQuery, argsToMatch, localQueryStore, item } = options
	const queries = localQueryStore.getAllQueries(paginatedQuery)
	const queriesThatMatch = queries.filter((q) => {
		if (argsToMatch === undefined) {
			return true
		}
		return Object.keys(argsToMatch).every(
			(k) =>
				compareValues(
					(argsToMatch as Record<string, unknown>)[k] as Value,
					(q.args as Record<string, unknown>)[k] as Value,
				) === 0,
		)
	})
	const firstPage = queriesThatMatch.find((q) => q.args.paginationOpts.cursor === null)
	if (firstPage === undefined || firstPage.value === undefined) {
		return
	}
	localQueryStore.setQuery(paginatedQuery, firstPage.args, {
		...firstPage.value,
		page: [item, ...firstPage.value.page],
	})
}

export function insertAtBottomIfLoaded<Query extends PaginatedQueryReference>(options: {
	paginatedQuery: Query
	argsToMatch?: Partial<PaginatedQueryArgs<Query>>
	localQueryStore: OptimisticLocalStore
	item: PaginatedQueryItem<Query>
}) {
	console.debug("[Convex] insertAtBottomIfLoaded called", options)
	const { paginatedQuery, localQueryStore, item, argsToMatch } = options
	const queries = localQueryStore.getAllQueries(paginatedQuery)
	const queriesThatMatch = queries.filter((q) => {
		if (argsToMatch === undefined) {
			return true
		}
		return Object.keys(argsToMatch).every(
			(k) =>
				compareValues(
					argsToMatch[k as keyof typeof argsToMatch] as Value,
					q.args[k as keyof typeof q.args] as Value,
				) === 0,
		)
	})

	const lastPage = queriesThatMatch.find((q) => q.value?.isDone)

	if (lastPage === undefined) {
		return
	}

	localQueryStore.setQuery(paginatedQuery, lastPage.args, {
		...lastPage.value!,
		page: [...lastPage.value!.page, item],
	})
}

export function insertAtPosition<Query extends PaginatedQueryReference>(options: {
	paginatedQuery: Query
	argsToMatch?: Partial<PaginatedQueryArgs<Query>>
	sortOrder: "asc" | "desc"
	sortKeyFromItem: (element: PaginatedQueryItem<Query>) => Value | Value[]
	localQueryStore: OptimisticLocalStore
	item: PaginatedQueryItem<Query>
}) {
	const { paginatedQuery, sortOrder, sortKeyFromItem, localQueryStore, item, argsToMatch } = options

	const queries = localQueryStore.getAllQueries(paginatedQuery)
	const queryGroups: Record<string, any[]> = {}

	for (const query of queries) {
		if (
			argsToMatch !== undefined &&
			!Object.keys(argsToMatch).every((k) => {
				const key = k as keyof typeof argsToMatch
				return argsToMatch[key] === (query.args as any)[key]
			})
		) {
			continue
		}
		const key = JSON.stringify(
			Object.fromEntries(
				Object.entries(query.args).map(([k, v]) => [k, k === "paginationOpts" ? (v as any).id : v]),
			),
		)
		queryGroups[key] ??= []
		queryGroups[key].push(query)
	}

	for (const pageQueries of Object.values(queryGroups)) {
		insertAtPositionInPages({
			pageQueries,
			paginatedQuery,
			sortOrder,
			sortKeyFromItem,
			localQueryStore,
			item,
		})
	}
}

function insertAtPositionInPages<Query extends PaginatedQueryReference>(options: {
	pageQueries: any[]
	paginatedQuery: Query
	sortOrder: "asc" | "desc"
	sortKeyFromItem: (element: PaginatedQueryItem<Query>) => Value | Value[]
	localQueryStore: OptimisticLocalStore
	item: PaginatedQueryItem<Query>
}) {
	const { pageQueries, sortOrder, sortKeyFromItem, localQueryStore, item, paginatedQuery } = options

	const insertedKey = sortKeyFromItem(item)
	const loadedPages = pageQueries.filter((q) => q.value !== undefined && q.value.page.length > 0)

	const sortedPages = loadedPages.sort((a, b) => {
		const aKey = sortKeyFromItem(a.value.page[0])
		const bKey = sortKeyFromItem(b.value.page[0])
		if (sortOrder === "asc") {
			return compareValues(aKey, bKey)
		}
		return compareValues(bKey, aKey)
	})

	const firstLoadedPage = sortedPages[0]
	if (firstLoadedPage === undefined) {
		return
	}

	const firstPageKey = sortKeyFromItem(firstLoadedPage.value.page[0])
	const isBeforeFirstPage =
		sortOrder === "asc"
			? compareValues(insertedKey, firstPageKey) <= 0
			: compareValues(insertedKey, firstPageKey) >= 0

	if (isBeforeFirstPage) {
		if (firstLoadedPage.args.paginationOpts.cursor === null) {
			localQueryStore.setQuery(paginatedQuery, firstLoadedPage.args, {
				...firstLoadedPage.value,
				page: [item, ...firstLoadedPage.value.page],
			})
		}
		return
	}

	const lastLoadedPage = sortedPages[sortedPages.length - 1]
	if (lastLoadedPage === undefined) {
		return
	}

	const lastPageKey = sortKeyFromItem(lastLoadedPage.value.page[lastLoadedPage.value.page.length - 1])
	const isAfterLastPage =
		sortOrder === "asc"
			? compareValues(insertedKey, lastPageKey) >= 0
			: compareValues(insertedKey, lastPageKey) <= 0

	if (isAfterLastPage) {
		if (lastLoadedPage.value.isDone) {
			localQueryStore.setQuery(paginatedQuery, lastLoadedPage.args, {
				...lastLoadedPage.value,
				page: [...lastLoadedPage.value.page, item],
			})
		}
		return
	}

	const successorPageIndex = sortedPages.findIndex((p) =>
		sortOrder === "asc"
			? compareValues(sortKeyFromItem(p.value.page[0]), insertedKey) > 0
			: compareValues(sortKeyFromItem(p.value.page[0]), insertedKey) < 0,
	)

	const pageToUpdate =
		successorPageIndex === -1 ? sortedPages[sortedPages.length - 1] : sortedPages[successorPageIndex - 1]

	if (pageToUpdate === undefined) {
		return
	}

	const indexWithinPage = pageToUpdate.value.page.findIndex((e) =>
		sortOrder === "asc"
			? compareValues(sortKeyFromItem(e), insertedKey) >= 0
			: compareValues(sortKeyFromItem(e), insertedKey) <= 0,
	)

	const newPage =
		indexWithinPage === -1
			? [...pageToUpdate.value.page, item]
			: [
					...pageToUpdate.value.page.slice(0, indexWithinPage),
					item,
					...pageToUpdate.value.page.slice(indexWithinPage),
				]

	localQueryStore.setQuery(paginatedQuery, pageToUpdate.args, {
		...pageToUpdate.value,
		page: newPage,
	})
}
