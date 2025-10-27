import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { PinnedMessagePolicy } from "../../policies/pinned-message-policy"
import { PinnedMessageRepo } from "../../repositories/pinned-message-repo"
import { PinnedMessageRpcs } from "../groups/pinned-messages"

/**
 * Pinned Message RPC Handlers
 *
 * Implements the business logic for all pinned message-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const PinnedMessageRpcLive = PinnedMessageRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			/**
			 * PinnedMessageCreate Handler
			 *
			 * Pins a message in a channel. The pinnedBy field is automatically set
			 * from the authenticated user.
			 *
			 * Process:
			 * 1. Get current user from context (provided by AuthMiddleware)
			 * 2. Start database transaction
			 * 3. Create pinned message with pinnedBy set to current user
			 * 4. Check permissions via PinnedMessagePolicy.canCreate
			 * 5. Generate transaction ID for optimistic updates
			 * 6. Return pinned message data and transaction ID
			 */
			PinnedMessageCreate: (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const createdPinnedMessage = yield* PinnedMessageRepo.insert({
								...payload,
								pinnedBy: user.id,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(PinnedMessagePolicy.canCreate(payload.channelId)),
							)

							const txid = yield* generateTransactionId()

							return {
								data: createdPinnedMessage,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("PinnedMessage", "create")),

			/**
			 * PinnedMessageUpdate Handler
			 *
			 * Updates an existing pinned message.
			 * Only users with appropriate permissions can update.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update pinned message
			 * 3. Check permissions via PinnedMessagePolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated pinned message data and transaction ID
			 */
			PinnedMessageUpdate: ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedPinnedMessage = yield* PinnedMessageRepo.update({
								id,
								...payload,
							}).pipe(policyUse(PinnedMessagePolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: updatedPinnedMessage,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("PinnedMessage", "update")),

			/**
			 * PinnedMessageDelete Handler
			 *
			 * Unpins a message from a channel (hard delete).
			 * Only users with appropriate permissions can unpin messages.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete pinned message
			 * 3. Check permissions via PinnedMessagePolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			PinnedMessageDelete: ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* PinnedMessageRepo.deleteById(id).pipe(
								policyUse(PinnedMessagePolicy.canDelete(id)),
							)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("PinnedMessage", "delete")),
		}
	}),
)
