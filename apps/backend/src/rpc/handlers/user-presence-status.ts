import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { UserPresenceStatusPolicy } from "../../policies/user-presence-status-policy"
import { UserPresenceStatusRepo } from "../../repositories/user-presence-status-repo"
import { UserPresenceStatusRpcs } from "../groups/user-presence-status"

/**
 * User Presence Status RPC Handlers
 *
 * Implements the business logic for user presence status RPC methods.
 * The handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const UserPresenceStatusRpcLive = UserPresenceStatusRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			/**
			 * UserPresenceStatusUpdate Handler
			 *
			 * Updates the current authenticated user's presence status and optional custom message.
			 * Uses upsertByUserId to handle both creation and updates.
			 *
			 * Process:
			 * 1. Get current user from context (provided by AuthMiddleware)
			 * 2. Start database transaction
			 * 3. Upsert user presence status (create if doesn't exist, update if exists)
			 * 4. Check permissions via UserPresenceStatusPolicy.canUpdate
			 * 5. Generate transaction ID for optimistic updates
			 * 6. Return user presence status data and transaction ID
			 */
			"userPresenceStatus.update": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const updatedStatus = yield* UserPresenceStatusRepo.upsertByUserId({
								userId: user.id,
								status: payload.status as "online" | "away" | "busy" | "dnd" | "offline",
								customMessage: payload.customMessage,
								activeChannelId: null,
								updatedAt: new Date(),
							}).pipe(policyUse(UserPresenceStatusPolicy.canUpdate()))

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
