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
			/**
			 * NotificationCreate Handler
			 *
			 * Creates a new notification for a member. Checks permissions via
			 * NotificationPolicy.canCreate to ensure the user can create notifications
			 * for the target member.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Create notification
			 * 3. Check permissions via NotificationPolicy.canCreate
			 * 4. Generate transaction ID for optimistic updates
			 * 5. Return notification data and transaction ID
			 */
			NotificationCreate: (payload) =>
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

			/**
			 * NotificationUpdate Handler
			 *
			 * Updates an existing notification. Typically used to mark notifications
			 * as read. Only the notification owner or users with appropriate
			 * permissions can update.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update notification
			 * 3. Check permissions via NotificationPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated notification data and transaction ID
			 */
			NotificationUpdate: ({ id, ...payload }) =>
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

			/**
			 * NotificationDelete Handler
			 *
			 * Deletes a notification. Only the notification owner or users with
			 * appropriate permissions can delete.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete notification
			 * 3. Check permissions via NotificationPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			NotificationDelete: ({ id }) =>
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
