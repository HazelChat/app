import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse, withSystemActor } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { MessagePolicy } from "../policies/message-policy"
import { AttachmentRepo } from "../repositories/attachment-repo"
import { MessageRepo } from "../repositories/message-repo"

export const HttpMessageLive = HttpApiBuilder.group(HazelApi, "messages", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser.Context

					const { createdMessage, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								// Extract attachmentIds from payload (it's not a database field)
								const { attachmentIds, ...messageData } = payload

								const createdMessage = yield* MessageRepo.insert({
									...messageData,
									authorId: user.id,
									deletedAt: null,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(MessagePolicy.canCreate(payload.channelId)),
								)

								// If there are attachmentIds, update those attachments with the messageId
								if (attachmentIds && attachmentIds.length > 0) {
									// Update each attachment with the messageId (system operation)
									yield* Effect.forEach(attachmentIds, (attachmentId) =>
										AttachmentRepo.update({
											id: attachmentId,
											messageId: createdMessage.id,
										}).pipe(withSystemActor),
									)
								}

								const txid = yield* generateTransactionId(tx)

								return { createdMessage, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Message",
										cause: err,
									}),
								ParseError: (err) =>
									new InternalServerError({
										message: "Error Parsing Response Schema",
										cause: err,
									}),
							}),
						)

					return {
						data: createdMessage,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const _user = yield* CurrentUser.Context

					const { createdMessage, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdMessage = yield* MessageRepo.update({
									id: path.id,
									...payload,
								}).pipe(policyUse(MessagePolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId(tx)

								return { createdMessage, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Message",
										cause: err,
									}),
								ParseError: (err) =>
									new InternalServerError({
										message: "Error Parsing Response Schema",
										cause: err,
									}),
							}),
						)

					return {
						data: createdMessage,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const { txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								yield* MessageRepo.deleteById(path.id).pipe(
									policyUse(MessagePolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Message",
										cause: err,
									}),
							}),
						)

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
