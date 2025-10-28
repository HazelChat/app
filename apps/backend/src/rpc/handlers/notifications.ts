import { Database } from "@hazel/db"
import { policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { NotificationPolicy } from "../../policies/notification-policy"
import { NotificationRepo } from "../../repositories/notification-repo"
import { NotificationRpcs } from "../groups/notifications"

/**
 * Notification RPC Handlers
 *
 * Implements the business logic for all notification-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const NotificationRpcLive = NotificationRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"notification.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const createdNotification = yield* NotificationRepo.insert({
								...payload,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(NotificationPolicy.canCreate(payload.memberId as any)),
							)

							const txid = yield* generateTransactionId()

							return {
								data: createdNotification,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Notification", "create")),

			"notification.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedNotification = yield* NotificationRepo.update({
								id,
								...payload,
							}).pipe(policyUse(NotificationPolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: updatedNotification,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Notification", "update")),

			"notification.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* NotificationRepo.deleteById(id).pipe(
								policyUse(NotificationPolicy.canDelete(id)),
							)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("Notification", "delete")),
		}
	}),
)
