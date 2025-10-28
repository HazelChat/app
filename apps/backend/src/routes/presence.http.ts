import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { withRemapDbErrors, withSystemActor } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { UserPresenceStatusRepo } from "../repositories/user-presence-status-repo"

export const HttpPresencePublicLive = HttpApiBuilder.group(HazelApi, "presencePublic", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers.handle(
			"markOffline",
			Effect.fn(function* ({ payload }) {
				// No auth or policy check since this is a public endpoint called by sendBeacon
				yield* db
					.transaction(
						Effect.asVoid(
							UserPresenceStatusRepo.updateStatus({
								userId: payload.userId,
								status: "offline",
								customMessage: null,
							}),
						),
					)
					.pipe(withSystemActor, withRemapDbErrors("UserPresenceStatus", "update"))

				return {
					success: true,
				}
			}),
		)
	}),
)
