import { FetchHttpClient, HttpApiClient } from "@effect/platform"
import { MakiApi } from "@maki-chat/api-schema"
import type { MessageId } from "@maki-chat/api-schema/schema/message.js"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { Effect, Logger, ManagedRuntime, Runtime } from "effect"

const appLayer = Logger.replace(
	Logger.defaultLogger,
	// Custom logger implementation
	Logger.make(({ message }) => console.log(message)),
)

const runtime = ManagedRuntime.make(appLayer)

const runEffect = <A, E>(effect: Effect.Effect<A, E>) => runtime.runPromise(effect)

export const createInfiniteMessages = (limit = 20) => {
	return useInfiniteQuery(() => ({
		queryKey: ["messages", limit],
		queryFn: ({ pageParam }) =>
			runEffect(
				Effect.gen(function* () {
					const apiClient = yield* HttpApiClient.make(MakiApi, {
						baseUrl: "http://localhost:8787",
					})
					const result = yield* apiClient.Message.getMessages({
						urlParams: {
							limit: limit,
							cursor: pageParam as MessageId | undefined,
						},
					})

					return result
				}).pipe(Effect.provide(FetchHttpClient.layer)),
			),
		getNextPageParam: (lastPage) => (lastPage.pagination.hasNext ? lastPage.pagination.nextCursor : undefined),
		getPreviousPageParam: (firstPage) =>
			firstPage.pagination.hasPrevious ? firstPage.pagination.previousCursor : undefined,
		initialPageParam: undefined as string | undefined,
	}))
}
