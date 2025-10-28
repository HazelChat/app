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
			"pinnedMessage.create": (payload) =>
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

			"pinnedMessage.update": ({ id, ...payload }) =>
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

			"pinnedMessage.delete": ({ id }) =>
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
