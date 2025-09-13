import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { CurrentUser } from "../lib/auth"
import { generateTransactionId } from "../lib/create-transactionId"
import { InternalServerError } from "../lib/errors"
import { AttachmentRepo } from "../repositories/attachment-repo"
import { MessageRepo } from "../repositories/message-repo"

export const HttpMessageLive = HttpApiBuilder.group(HazelApi, "messages", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser

					// TODO: Verify the user has permission to post in this channel
					// This would typically check channel membership, organization membership, etc.
					// For now, we'll just create the message

					const { createdMessage, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								// Extract attachmentIds from payload (it's not a database field)
								const { attachmentIds, ...messageData } = payload
								
								const createdMessage = yield* MessageRepo.insert({
									...messageData,
									authorId: user.id,
									deletedAt: null,
								}).pipe(Effect.map((res) => res[0]!))

								// If there are attachmentIds, update those attachments with the messageId
								if (attachmentIds && attachmentIds.length > 0) {
									// Update each attachment with the messageId
									yield* Effect.forEach(attachmentIds, (attachmentId) =>
										AttachmentRepo.update({
											id: attachmentId,
											messageId: createdMessage.id,
										}),
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
					const _user = yield* CurrentUser

					// TODO: Verify the user has permission to post in this channel
					// This would typically check channel membership, organization membership, etc.
					// For now, we'll just create the message

					const { createdMessage, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdMessage = yield* MessageRepo.update({
									id: path.id,
									...payload,
								})

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
								yield* MessageRepo.deleteById(path.id)

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
