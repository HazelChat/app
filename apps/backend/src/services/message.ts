import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors, withSystemActor } from "@hazel/domain"
import type { AttachmentId, ChannelId, MessageId } from "@hazel/domain/ids"
import type { Message } from "@hazel/domain/models"
import { Effect } from "effect"
import { generateTransactionId } from "../lib/create-transactionId"
import { MessagePolicy } from "../policies/message-policy"
import { AttachmentRepo } from "../repositories/attachment-repo"
import { MessageRepo } from "../repositories/message-repo"
import { DatabaseLive } from "./database"

/**
 * @effect-leakable-service
 */
export class MessageService extends Effect.Service<MessageService>()("MessageService", {
	accessors: true,
	dependencies: [
		MessageRepo.Default,
		AttachmentRepo.Default,
		DatabaseLive,
	],
	effect: Effect.gen(function* () {
		const messageRepo = yield* MessageRepo
		const attachmentRepo = yield* AttachmentRepo
		const db = yield* Database.Database

		const create = (payload: {
			channelId: ChannelId
			content: string
			attachmentIds?: AttachmentId[]
		}) =>
			db.transaction(
				Effect.gen(function* () {
					const user = yield* CurrentUser.Context

					const createdMessage = yield* messageRepo.insert({
						channelId: payload.channelId,
						content: payload.content,
						authorId: user.id,
						replyToMessageId: null,
						threadChannelId: null,
						deletedAt: null,
					}).pipe(
						Effect.map((res) => res[0]!),
						policyUse(MessagePolicy.canCreate(payload.channelId)),
					)

					if (payload.attachmentIds && payload.attachmentIds.length > 0) {
						yield* Effect.forEach(payload.attachmentIds, (attachmentId) =>
							attachmentRepo.update({
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
				})
			).pipe(withRemapDbErrors("Message", "create"))

		const update = (id: MessageId, payload: Partial<typeof Message.Model.jsonUpdate.Type>) =>
			db.transaction(
				Effect.gen(function* () {
					const updatedMessage = yield* messageRepo.update({
						id,
						...payload,
					}).pipe(policyUse(MessagePolicy.canUpdate(id)))

					const txid = yield* generateTransactionId()

					return {
						data: updatedMessage,
						transactionId: txid,
					}
				})
			).pipe(withRemapDbErrors("Message", "update"))

		const delete_ = (id: MessageId) =>
			db.transaction(
				Effect.gen(function* () {
					yield* messageRepo.deleteById(id).pipe(policyUse(MessagePolicy.canDelete(id)))
					const txid = yield* generateTransactionId()
					return { transactionId: txid }
				})
			).pipe(withRemapDbErrors("Message", "delete"))

		return { create, update, delete: delete_ }
	})
})
