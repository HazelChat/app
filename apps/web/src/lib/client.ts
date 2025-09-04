import { FetchHttpClient, HttpApiClient } from "@effect/platform"
import { AtomHttpApi, Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { HazelApi } from "@hazel/backendv2/api"
import { Effect } from "effect"

export const backendClient = HttpApiClient.make(HazelApi, {
	baseUrl: "http://localhost:3003",
}).pipe(Effect.provide(FetchHttpClient.layer))

export class HazelApiClient extends AtomHttpApi.Tag<HazelApiClient>()("HazelApiClient", {
	api: HazelApi,
	httpClient: FetchHttpClient.layer,
	baseUrl: "http://localhost:3003",
}) {}
