import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { UserPresenceStatusPolicy } from "../../policies/user-presence-status-policy"
import { UserPresenceStatusRepo } from "../../repositories/user-presence-status-repo"
import { UserPresenceStatusRpcs } from "../groups/user-presence-status"

export const UserPresenceStatusRpcLive = UserPresenceStatusRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"userPresenceStatus.update": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const existingOption = yield* UserPresenceStatusRepo.findByUserId(user.id).pipe(
								policyUse(UserPresenceStatusPolicy.canRead()),
							)

							const existing = Option.getOrNull(existingOption)

							const updatedStatus = yield* UserPresenceStatusRepo.upsertByUserId({
								userId: user.id,
								status: (payload.status ?? existing?.status ?? "online") as
									| "online"
									| "away"
									| "busy"
									| "dnd"
									| "offline",
								customMessage:
									payload.customMessage !== undefined
										? payload.customMessage
										: (existing?.customMessage ?? null),
								activeChannelId:
									payload.activeChannelId !== undefined
										? payload.activeChannelId
										: (existing?.activeChannelId ?? null),
								updatedAt: new Date(),
							}).pipe(policyUse(UserPresenceStatusPolicy.canCreate()))

							const txid = yield* generateTransactionId()

							return {
								data: updatedStatus!,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("UserPresenceStatus", "update")),
		}
	}),
)
