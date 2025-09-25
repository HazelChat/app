import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { MessageReactionPolicy } from "../policies/message-reaction-policy"
import { MessageReactionRepo } from "../repositories/message-reaction-repo"

export const HttpMessageReactionLive = HttpApiBuilder.group(HazelApi, "messageReactions", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser.Context

					const { createdMessageReaction, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdMessageReaction = yield* MessageReactionRepo.insert({
									...payload,
									userId: user.id,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(MessageReactionPolicy.canCreate(payload.messageId)),
								)

								const txid = yield* generateTransactionId(tx)

								return { createdMessageReaction, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Message Reaction",
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
						data: createdMessageReaction,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedMessageReaction, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const updatedMessageReaction = yield* MessageReactionRepo.update({
									id: path.id,
									...payload,
								})

								const txid = yield* generateTransactionId(tx)

								return { updatedMessageReaction, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Updating Message Reaction",
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
						data: updatedMessageReaction,
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
								yield* MessageReactionRepo.deleteById(path.id).pipe(
									policyUse(MessageReactionPolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Deleting Message Reaction",
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
