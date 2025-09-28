import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import * as HttpApiClient from "@effect/platform/HttpApiClient"
import * as HttpClient from "@effect/platform/HttpClient"
import { HazelApi } from "@hazel/backend/api"
import { Layer } from "effect"
import * as Effect from "effect/Effect"

export const CustomFetchLive = FetchHttpClient.layer.pipe(
	Layer.provide(
		Layer.succeed(FetchHttpClient.RequestInit, {
			credentials: "include",
		}),
	),
)

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
	accessors: true,
	dependencies: [CustomFetchLive],
	effect: Effect.gen(function* () {
		return yield* HttpApiClient.make(HazelApi, {
			baseUrl: import.meta.env.VITE_BACKEND_URL,
			transformClient: (client) => client.pipe(HttpClient.retryTransient({ times: 3 })),
		})
	}),
}) {}
