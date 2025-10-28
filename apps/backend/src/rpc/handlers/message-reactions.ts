import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { MessageReactionPolicy } from "../../policies/message-reaction-policy"
import { MessageReactionRepo } from "../../repositories/message-reaction-repo"
import { MessageReactionRpcs } from "../groups/message-reactions"

/**
 * MessageReaction RPC Handlers
 *
 * Implements the business logic for all message reaction-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const MessageReactionRpcLive = MessageReactionRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"messageReaction.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const createdMessageReaction = yield* MessageReactionRepo.insert({
								...payload,
								userId: user.id,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(MessageReactionPolicy.canCreate(payload.messageId)),
							)

							const txid = yield* generateTransactionId()

							return {
								data: createdMessageReaction,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("MessageReaction", "create")),

			"messageReaction.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedMessageReaction = yield* MessageReactionRepo.update({
								id,
								...payload,
							}).pipe(policyUse(MessageReactionPolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: updatedMessageReaction,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("MessageReaction", "update")),

			"messageReaction.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* MessageReactionRepo.deleteById(id).pipe(
								policyUse(MessageReactionPolicy.canDelete(id)),
							)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("MessageReaction", "delete")),
		}
	}),
)
