import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { UserPresenceStatusPolicy } from "../policies/user-presence-status-policy"
import { UserPresenceStatusRepo } from "../repositories/user-presence-status-repo"

export const HttpPresenceLive = HttpApiBuilder.group(HazelApi, "presence", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"updateStatus",
				Effect.fn(function* ({ payload }) {
					const currentUser = yield* CurrentUser.CurrentUser

					const { status, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								// Upsert user presence status
								const result = yield* UserPresenceStatusRepo.upsertByUserId({
									userId: currentUser.id,
									status: payload.status,
									customMessage: payload.customMessage ?? null,
									activeChannelId: null,
									updatedAt: new Date(),
								}).pipe(policyUse(UserPresenceStatusPolicy.canUpdate()))

								const txid = yield* generateTransactionId()

								return { status: result, txid }
							}),
						)
						.pipe(withRemapDbErrors("UserPresenceStatus", "update"))

					return {
						data: status,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"updateActiveChannel",
				Effect.fn(function* ({ payload }) {
					const currentUser = yield* CurrentUser.CurrentUser

					const { status, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								// Update or create status with active channel
								const existingOption = yield* UserPresenceStatusRepo.findByUserId(
									currentUser.id,
								)

								let result
								if (Option.isSome(existingOption)) {
									// Update existing
									const updated = yield* UserPresenceStatusRepo.updateActiveChannel({
										userId: currentUser.id,
										activeChannelId: payload.activeChannelId,
									}).pipe(policyUse(UserPresenceStatusPolicy.canUpdate()))

									result = updated[0]!
								} else {
									// Create new
									result = yield* UserPresenceStatusRepo.upsertByUserId({
										userId: currentUser.id,
										status: "online",
										customMessage: null,
										activeChannelId: payload.activeChannelId,
										updatedAt: new Date(),
									}).pipe(policyUse(UserPresenceStatusPolicy.canUpdate()))
								}

								const txid = yield* generateTransactionId()

								return { status: result, txid }
							}),
						)
						.pipe(withRemapDbErrors("UserPresenceStatus", "update"))

					return {
						data: status,
						transactionId: txid,
					}
				}),
			)
	}),
)
