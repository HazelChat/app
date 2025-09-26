import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { NotificationPolicy } from "../policies/notification-policy"
import { NotificationRepo } from "../repositories/notification-repo"

export const HttpNotificationLive = HttpApiBuilder.group(HazelApi, "notifications", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const { createdNotification, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdNotification = yield* NotificationRepo.insert({
									...payload,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(NotificationPolicy.canCreate(payload.memberId as any)),
								)

								const txid = yield* generateTransactionId(tx)

								return { createdNotification, txid }
							}),
						)
						.pipe(withRemapDbErrors("Notification", "create"))

					return {
						data: createdNotification,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedNotification, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const updatedNotification = yield* NotificationRepo.update({
									id: path.id,
									...payload,
								}).pipe(policyUse(NotificationPolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId(tx)

								return { updatedNotification, txid }
							}),
						)
						.pipe(withRemapDbErrors("Notification", "update"))

					return {
						data: updatedNotification,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const { txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								yield* NotificationRepo.deleteById(path.id).pipe(
									policyUse(NotificationPolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(withRemapDbErrors("Notification", "delete"))

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
