import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors, withSystemActor } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { MessagePolicy } from "../../policies/message-policy"
import { AttachmentRepo } from "../../repositories/attachment-repo"
import { MessageRepo } from "../../repositories/message-repo"
import { MessageRpcs } from "../groups/messages"

/**
 * Message RPC Handlers
 *
 * Implements the business logic for all message-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const MessageRpcLive = MessageRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"message.create": ({ attachmentIds, ...messageData }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const createdMessage = yield* MessageRepo.insert({
								...messageData,
								authorId: user.id,
								deletedAt: null,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(MessagePolicy.canCreate(messageData.channelId)),
							)

							// Update attachments with messageId if provided
							if (attachmentIds && attachmentIds.length > 0) {
								yield* Effect.forEach(attachmentIds, (attachmentId) =>
									AttachmentRepo.update({
										id: attachmentId,
										messageId: createdMessage.id,
									}).pipe(withSystemActor),
								)
							}

							const txid = yield* generateTransactionId()

							return {
								data: createdMessage,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Message", "create")),

			"message.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedMessage = yield* MessageRepo.update({
								id,
								...payload,
							}).pipe(policyUse(MessagePolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: updatedMessage,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("Message", "update")),

			"message.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* MessageRepo.deleteById(id).pipe(policyUse(MessagePolicy.canDelete(id)))

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("Message", "delete")),
		}
	}),
)
