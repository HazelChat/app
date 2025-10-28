import { HttpApiBuilder } from "@effect/platform"
import { CurrentUser } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"

export const HttpUserLive = HttpApiBuilder.group(HazelApi, "users", (handlers) =>
	Effect.gen(function* () {
		return handlers.handle(
			"me",
			Effect.fn(function* () {
				const currentUser = yield* CurrentUser.Context

				return currentUser
			}),
		)
	}),
)
