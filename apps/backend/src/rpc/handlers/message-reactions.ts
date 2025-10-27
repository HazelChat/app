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
			/**
			 * MessageReactionCreate Handler
			 *
			 * Creates a new reaction on a message. The userId is automatically set
			 * from the authenticated user.
			 *
			 * Process:
			 * 1. Get current user from context (provided by AuthMiddleware)
			 * 2. Start database transaction
			 * 3. Create message reaction with userId set to current user
			 * 4. Check permissions via MessageReactionPolicy.canCreate
			 * 5. Generate transaction ID for optimistic updates
			 * 6. Return message reaction data and transaction ID
			 */
			MessageReactionCreate: (payload) =>
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

			/**
			 * MessageReactionUpdate Handler
			 *
			 * Updates an existing message reaction. Only the reaction creator or users
			 * with appropriate permissions can update a reaction.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update message reaction
			 * 3. Check permissions via MessageReactionPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated message reaction data and transaction ID
			 */
			MessageReactionUpdate: ({ id, ...payload }) =>
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

			/**
			 * MessageReactionDelete Handler
			 *
			 * Deletes a message reaction. Only the reaction creator or users with
			 * appropriate permissions can delete a reaction.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete message reaction
			 * 3. Check permissions via MessageReactionPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			MessageReactionDelete: ({ id }) =>
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
