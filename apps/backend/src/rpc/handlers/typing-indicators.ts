import { Database } from "@hazel/db"
import { policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { TypingIndicatorPolicy } from "../../policies/typing-indicator-policy"
import { TypingIndicatorRepo } from "../../repositories/typing-indicator-repo"
import { TypingIndicatorNotFoundError, TypingIndicatorRpcs } from "../groups/typing-indicators"

/**
 * Typing Indicator RPC Handlers
 *
 * Implements the business logic for all typing indicator-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 *
 * Note: Typing indicators use upsert logic for creation to handle concurrent
 * typing events from the same user in the same channel.
 */
export const TypingIndicatorRpcLive = TypingIndicatorRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			/**
			 * TypingIndicatorCreate Handler
			 *
			 * Creates or updates a typing indicator for a user in a channel.
			 * Uses upsert logic to handle cases where the typing indicator already exists.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Upsert typing indicator by channelId and memberId
			 * 3. Check permissions via TypingIndicatorPolicy.canCreate
			 * 4. Generate transaction ID for optimistic updates
			 * 5. Return typing indicator data and transaction ID
			 */
			"typingIndicator.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							// Use upsert to create or update typing indicator
							const result = yield* TypingIndicatorRepo.upsertByChannelAndMember({
								channelId: payload.channelId,
								memberId: payload.memberId,
								lastTyped: payload.lastTyped ?? Date.now(),
							}).pipe(policyUse(TypingIndicatorPolicy.canCreate(payload.channelId)))

							const typingIndicator = result[0]!

							const txid = yield* generateTransactionId()

							return {
								data: typingIndicator,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("TypingIndicator", "create")),

			/**
			 * TypingIndicatorUpdate Handler
			 *
			 * Updates an existing typing indicator's timestamp.
			 * Automatically sets lastTyped to current time.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update typing indicator
			 * 3. Check permissions via TypingIndicatorPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated typing indicator data and transaction ID
			 */
			"typingIndicator.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const typingIndicator = yield* TypingIndicatorRepo.update({
								...payload,
								id,
								lastTyped: Date.now(),
							}).pipe(policyUse(TypingIndicatorPolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: typingIndicator,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("TypingIndicator", "update")),

			/**
			 * TypingIndicatorDelete Handler
			 *
			 * Deletes a typing indicator when the user stops typing.
			 * Returns the deleted typing indicator data for optimistic updates.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Find existing typing indicator
			 * 3. Check read permissions to verify access
			 * 4. Delete typing indicator
			 * 5. Check delete permissions
			 * 6. Generate transaction ID
			 * 7. Return deleted typing indicator data and transaction ID
			 */
			"typingIndicator.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							// First find the typing indicator to return it
							const existingOption = yield* TypingIndicatorRepo.findById(id).pipe(
								policyUse(TypingIndicatorPolicy.canRead(id)),
							)

							if (Option.isNone(existingOption)) {
								return yield* Effect.fail(
									new TypingIndicatorNotFoundError({ typingIndicatorId: id }),
								)
							}

							const existing = existingOption.value

							yield* TypingIndicatorRepo.deleteById(id).pipe(
								policyUse(TypingIndicatorPolicy.canDelete({ id })),
							)

							const txid = yield* generateTransactionId()

							return { data: existing, transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("TypingIndicator", "delete")),
		}
	}),
)
