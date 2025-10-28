import { Database } from "@hazel/db"
import { policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { DirectMessageParticipantPolicy } from "../../policies/direct-message-participant-policy"
import { DirectMessageParticipantRepo } from "../../repositories/direct-message-participant-repo"
import { DirectMessageParticipantRpcs } from "../groups/direct-message-participants"

/**
 * Direct Message Participant RPC Handlers
 *
 * Implements the business logic for direct message participant-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const DirectMessageParticipantRpcLive = DirectMessageParticipantRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"directMessageParticipant.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const createdParticipant = yield* DirectMessageParticipantRepo.insert(
								payload,
							).pipe(
								Effect.map((res) => res[0]!),
								policyUse(DirectMessageParticipantPolicy.canCreate(payload.channelId)),
							)

							const txid = yield* generateTransactionId()

							return {
								data: createdParticipant,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("DirectMessageParticipant", "create")),

			"directMessageParticipant.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedParticipant = yield* DirectMessageParticipantRepo.update({
								id,
								...payload,
							}).pipe(policyUse(DirectMessageParticipantPolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: updatedParticipant,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("DirectMessageParticipant", "update")),

			"directMessageParticipant.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* DirectMessageParticipantRepo.deleteById(id)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(
						policyUse(DirectMessageParticipantPolicy.canDelete(id)),
						withRemapDbErrors("DirectMessageParticipant", "delete"),
					),
		}
	}),
)
