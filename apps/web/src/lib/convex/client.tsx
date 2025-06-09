import { BaseConvexClient, type OptimisticUpdate, type QueryToken } from "convex/browser"
import type { BaseConvexClientOptions, ConnectionState } from "convex/browser"
import type { QueryJournal } from "convex/browser"
import {
	type FunctionArgs,
	type FunctionReference,
	type FunctionReturnType,
	type OptionalRestArgs,
	type UserIdentityAttributes,
	getFunctionName,
} from "convex/server"
import { type Value, convexToJson } from "convex/values"
import {
	type Accessor,
	type Context,
	type JSX,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js"
import { type AuthTokenFetcher, parseArgs } from "./helpers"

export interface SolidMutation<Mutation extends FunctionReference<"mutation">> {
	(...args: OptionalRestArgs<Mutation>): Promise<FunctionReturnType<Mutation>>
	withOptimisticUpdate(optimisticUpdate: OptimisticUpdate<FunctionArgs<Mutation>>): SolidMutation<Mutation>
}

export type SolidAction<Action extends FunctionReference<"action">> = (
	...args: OptionalRestArgs<Action>
) => Promise<FunctionReturnType<Action>>

export interface Watch<T> {
	onUpdate(callback: () => void): () => void
	localQueryResult(): T | undefined
	localQueryLogs(): string[] | undefined
	journal(): QueryJournal | undefined
}

export interface WatchQueryOptions {
	journal?: QueryJournal
	componentPath?: string
}

export interface MutationOptions<Args extends Record<string, Value>> {
	optimisticUpdate?: OptimisticUpdate<Args>
}

export interface ConvexSolidClientOptions extends BaseConvexClientOptions {}

export class ConvexSolidClient {
	address: string
	private cachedSync?: BaseConvexClient
	private listeners: Map<QueryToken, Set<() => void>>
	private options: ConvexSolidClientOptions
	private closed = false
	private adminAuth?: string
	private fakeUserIdentity?: UserIdentityAttributes
	private authPromise?: Promise<boolean>
	private authSetPromise?: Promise<void>
	private resolveAuthSet?: () => void

	constructor(address: string, options?: ConvexSolidClientOptions) {
		if (address === undefined) {
			throw new Error(
				"No address provided to ConvexSolidClient.\n" +
					"If trying to deploy to production, make sure to follow all the instructions found at https://docs.convex.dev/production/hosting/\n" +
					"If running locally, make sure to run `convex dev` and ensure the .env.local file is populated.",
			)
		}
		if (typeof address !== "string") {
			throw new Error(
				`ConvexSolidClient requires a URL like 'https://happy-otter-123.convex.cloud', received something of type ${typeof address} instead.`,
			)
		}
		if (!address.includes("://")) {
			throw new Error("Provided address was not an absolute URL.")
		}
		this.address = address
		this.listeners = new Map()
		this.options = options || {}

		// Create a promise that resolves when setAuth is called
		this.authSetPromise = new Promise((resolve) => {
			this.resolveAuthSet = resolve
		})
	}

	get sync() {
		if (this.closed) {
			throw new Error("ConvexSolidClient has already been closed.")
		}
		if (this.cachedSync) {
			return this.cachedSync
		}
		this.cachedSync = new BaseConvexClient(
			this.address,
			(updatedQueries) => this.transition(updatedQueries),
			this.options,
		)
		if (this.adminAuth) {
			// @ts-expect-error Internal API
			this.cachedSync.setAdminAuth(this.adminAuth, this.fakeUserIdentity)
		}
		return this.cachedSync
	}

	setAuth(fetchToken: AuthTokenFetcher, onChange?: (isAuthenticated: boolean) => void) {
		let resolveAuthPromise: ((isAuthenticated: boolean) => void) | undefined

		this.authPromise = new Promise((resolve) => {
			resolveAuthPromise = resolve
		})

		this.sync.setAuth(fetchToken, (isAuthenticated: boolean) => {
			if (resolveAuthPromise) {
				resolveAuthPromise(isAuthenticated)
				resolveAuthPromise = undefined
			}
			onChange?.(isAuthenticated)
		})

		// Resolve the "auth set" promise
		if (this.resolveAuthSet) {
			this.resolveAuthSet()
			this.resolveAuthSet = undefined
		}
	}

	clearAuth() {
		this.authPromise = undefined
		this.sync.clearAuth()

		// Reset the auth set promise
		this.authSetPromise = new Promise((resolve) => {
			this.resolveAuthSet = resolve
		})
	}

	async awaitAuth(): Promise<boolean> {
		// First, wait for setAuth to be called
		if (this.authSetPromise) {
			await this.authSetPromise
		}

		// Then wait for the auth resolution
		if (this.authPromise) {
			return this.authPromise
		}

		// If we get here, auth was cleared after being set
		return false
	}

	setAdminAuth(token: string, identity?: UserIdentityAttributes) {
		this.adminAuth = token
		this.fakeUserIdentity = identity
		if (this.closed) {
			throw new Error("ConvexSolidClient has already been closed.")
		}
		if (this.cachedSync) {
			// @ts-expect-error Internal API
			this.sync.setAdminAuth(token, identity)
		}
	}

	watchQuery<Query extends FunctionReference<"query">>(
		query: Query,
		args?: FunctionArgs<Query>,
		options?: WatchQueryOptions,
	): Watch<FunctionReturnType<Query>> {
		const name = getFunctionName(query)
		return {
			onUpdate: (callback) => {
				const { queryToken, unsubscribe } = this.sync.subscribe(name as string, args, options)

				const currentListeners = this.listeners.get(queryToken)
				if (currentListeners !== undefined) {
					currentListeners.add(callback)
				} else {
					this.listeners.set(queryToken, new Set([callback]))
				}

				return () => {
					if (this.closed) {
						return
					}

					const currentListeners = this.listeners.get(queryToken)!
					currentListeners.delete(callback)
					if (currentListeners.size === 0) {
						this.listeners.delete(queryToken)
					}
					unsubscribe()
				}
			},

			localQueryResult: () => {
				if (this.cachedSync) {
					return this.cachedSync.localQueryResult(name, args)
				}
				return undefined
			},

			localQueryLogs: () => {
				if (this.cachedSync) {
					// @ts-expect-error Internal API
					return this.cachedSync.localQueryLogs(name, args)
				}
				return undefined
			},

			journal: () => {
				if (this.cachedSync) {
					return this.cachedSync.queryJournal(name, args)
				}
				return undefined
			},
		}
	}

	mutation<Mutation extends FunctionReference<"mutation">>(
		mutation: Mutation,
		args?: FunctionArgs<Mutation>,
		options?: MutationOptions<FunctionArgs<Mutation>>,
	): Promise<FunctionReturnType<Mutation>> {
		const name = getFunctionName(mutation)
		return this.sync.mutation(name, args, options)
	}

	action<Action extends FunctionReference<"action">>(
		action: Action,
		args?: FunctionArgs<Action>,
	): Promise<FunctionReturnType<Action>> {
		const name = getFunctionName(action)
		return this.sync.action(name, args)
	}

	query<Query extends FunctionReference<"query">>(
		query: Query,
		args?: FunctionArgs<Query>,
	): Promise<FunctionReturnType<Query>> {
		const watch = this.watchQuery(query, args)
		const existingResult = watch.localQueryResult()
		if (existingResult !== undefined) {
			return Promise.resolve(existingResult)
		}
		return new Promise((resolve, reject) => {
			const unsubscribe = watch.onUpdate(() => {
				unsubscribe()
				try {
					resolve(watch.localQueryResult())
				} catch (e) {
					reject(e)
				}
			})
		})
	}

	connectionState(): ConnectionState {
		return this.sync.connectionState()
	}

	async close(): Promise<void> {
		this.closed = true
		this.listeners = new Map()
		this.authPromise = undefined
		this.authSetPromise = undefined
		this.resolveAuthSet = undefined
		if (this.cachedSync) {
			const sync = this.cachedSync
			this.cachedSync = undefined
			await sync.close()
		}
	}

	private transition(updatedQueries: QueryToken[]) {
		for (const queryToken of updatedQueries) {
			const callbacks = this.listeners.get(queryToken)
			if (callbacks) {
				for (const callback of callbacks) {
					callback()
				}
			}
		}
	}
}

export const ConvexContext: Context<ConvexSolidClient | undefined> = createContext<
	ConvexSolidClient | undefined
>()

export function ConvexProvider(props: {
	client: ConvexSolidClient
	children: JSX.Element
}) {
	return <ConvexContext.Provider value={props.client}>{props.children}</ConvexContext.Provider>
}

export function useConvex(): ConvexSolidClient {
	const client = useContext(ConvexContext)
	if (client === undefined) {
		throw new Error(
			"Could not find Convex client! `useConvex` must be used in the component " +
				"tree under `ConvexProvider`. Did you forget it?",
		)
	}
	return client
}

export function useAwaitAuth(): () => Promise<boolean> {
	const client = useConvex()
	return () => client.awaitAuth()
}

function createMutationInternal<Mutation extends FunctionReference<"mutation">>(
	mutationReference: Mutation,
	client: ConvexSolidClient,
	update?: OptimisticUpdate<any>,
): SolidMutation<Mutation> {
	function mutation(args?: Record<string, Value>): Promise<unknown> {
		assertNotAccidentalArgument(args)
		return client.mutation(mutationReference, args, {
			optimisticUpdate: update,
		})
	}

	mutation.withOptimisticUpdate = function withOptimisticUpdate(
		optimisticUpdate: OptimisticUpdate<any>,
	): SolidMutation<Mutation> {
		if (update !== undefined) {
			throw new Error(
				`Already specified optimistic update for mutation ${getFunctionName(mutationReference)}`,
			)
		}
		return createMutationInternal(mutationReference, client, optimisticUpdate)
	}
	return mutation as SolidMutation<Mutation>
}

function createActionInternal<Action extends FunctionReference<"action">>(
	actionReference: Action,
	client: ConvexSolidClient,
): SolidAction<Action> {
	return ((args?: Record<string, Value>): Promise<unknown> =>
		client.action(actionReference, args)) as SolidAction<Action>
}

export type OptionalRestArgsOrSkip<FuncRef extends FunctionReference<any>> = FuncRef["_args"] extends Record<
	string,
	never
>
	? [args?: Record<string, never> | "skip"]
	: [args: FuncRef["_args"] | "skip"]

export function createQuery<Query extends FunctionReference<"query">>(
	query: Query,
	args?: Accessor<OptionalRestArgsOrSkip<Query>>,
): Accessor<Query["_returnType"] | undefined> {
	const options = createMemo(() => {
		const opts = args?.()[0]

		const skip = opts === "skip"
		const argsObject = opts === "skip" ? {} : parseArgs(opts)

		return { skip, argsObject }
	})

	const queryName = getFunctionName(query)
	const client = useConvex()

	const [result, setResult] = createSignal<Query["_returnType"] | undefined>(undefined)
	const [error, setError] = createSignal<Error | undefined>(undefined)

	const memoizedArgs = createMemo(() => JSON.stringify(convexToJson(options().argsObject)))

	createEffect(() => {
		if (options().skip) {
			setResult(undefined)
			setError(undefined)
			return
		}

		memoizedArgs()

		const watch = client.watchQuery(query, options().argsObject)

		const existingResult = watch.localQueryResult()
		if (existingResult !== undefined) {
			setResult(existingResult)
		}

		const unsubscribe = watch.onUpdate(() => {
			try {
				const newResult = watch.localQueryResult()
				setResult(newResult)
				setError(undefined)
			} catch (e) {
				setError(e as Error)
				setResult(undefined)
			}
		})

		onCleanup(unsubscribe)
	})

	return createMemo(() => {
		const err = error()
		if (err) {
			throw err
		}
		return result()
	})
}

export function createMutation<Mutation extends FunctionReference<"mutation">>(
	mutation: Mutation,
): SolidMutation<Mutation> {
	const client = useConvex()

	return createMutationInternal(mutation, client)
}

export function createAction<Action extends FunctionReference<"action">>(
	action: Action,
): SolidAction<Action> {
	const client = useConvex()

	return createMemo(() => createActionInternal(action, client)) as unknown as SolidAction<Action>
}

function assertNotAccidentalArgument(value: any) {
	if (
		typeof value === "object" &&
		value !== null &&
		"bubbles" in value &&
		"persist" in value &&
		"isDefaultPrevented" in value
	) {
		throw new Error(
			"Convex function called with SyntheticEvent object. Did you use a Convex function as an event handler directly? Event handlers receive an event object as their first argument. These event objects are not valid Convex values. Try wrapping the function like `const handler = () => myMutation();` and using `handler` in the event handler.",
		)
	}
}
