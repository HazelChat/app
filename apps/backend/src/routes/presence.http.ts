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
					const currentUser = yield* CurrentUser.Context

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
					const currentUser = yield* CurrentUser.Context

					const { status, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								// Get existing status to preserve user's status and customMessage
								const existingOption = yield* UserPresenceStatusRepo.findByUserId(
									currentUser.id,
								).pipe(policyUse(UserPresenceStatusPolicy.canRead()))
								const existing = Option.getOrNull(existingOption)

								// Upsert with active channel, preserving existing status/customMessage
								const result = yield* UserPresenceStatusRepo.upsertByUserId({
									userId: currentUser.id,
									status: existing?.status ?? "online",
									customMessage: existing?.customMessage ?? null,
									activeChannelId: payload.activeChannelId,
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
	}),
)
