import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
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
							Effect.gen(function* () {
								const createdMessageReaction = yield* MessageReactionRepo.insert({
									...payload,
									userId: user.id,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(MessageReactionPolicy.canCreate(payload.messageId)),
								)

								const txid = yield* generateTransactionId()

								return { createdMessageReaction, txid }
							}),
						)
						.pipe(withRemapDbErrors("MessageReaction", "create"))

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
							Effect.gen(function* () {
								const updatedMessageReaction = yield* MessageReactionRepo.update({
									id: path.id,
									...payload,
								}).pipe(policyUse(MessageReactionPolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId()

								return { updatedMessageReaction, txid }
							}),
						)
						.pipe(withRemapDbErrors("MessageReaction", "update"))

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
							Effect.gen(function* () {
								yield* MessageReactionRepo.deleteById(path.id).pipe(
									policyUse(MessageReactionPolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId()

								return { txid }
							}),
						)
						.pipe(withRemapDbErrors("MessageReaction", "delete"))

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
