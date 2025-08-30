import { HttpApiClient } from "@effect/platform"

import { HazelApi } from "@hazel/backendv2"

const client = HttpApiClient.make(HazelApi, {
	baseUrl: "http://localhost:3003",
})
