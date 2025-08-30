import { WorkOS as WorkOSNodeAPI } from "@workos-inc/node"
import { Config, Data, Effect, Redacted } from "effect"

export class WorkOSApiError extends Data.TaggedError("WorkOSApiError")<{
	readonly cause: unknown
}> {}

export class WorkOS extends Effect.Service<WorkOS>()("Workos", {
	accessors: true,
	effect: Effect.gen(function* () {
		const apiKey = yield* Config.redacted("WORKOS_API_KEY")

		const workosClient = new WorkOSNodeAPI(Redacted.value(apiKey))

		const call = <A>(f: (client: WorkOSNodeAPI, signal: AbortSignal) => Promise<A>) =>
			Effect.tryPromise({
				try: (signal) => f(workosClient, signal),
				catch: (cause) => new WorkOSApiError({ cause }),
			})

		return {
			call,
		}
	}),
}) {}
