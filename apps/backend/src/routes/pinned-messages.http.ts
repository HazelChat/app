import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { PinnedMessagePolicy } from "../policies/pinned-message-policy"
import { PinnedMessageRepo } from "../repositories/pinned-message-repo"

export const HttpPinnedMessageLive = HttpApiBuilder.group(HazelApi, "pinnedMessages", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser.Context

					const { createdPinnedMessage, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const createdPinnedMessage = yield* PinnedMessageRepo.insert({
									...payload,
									pinnedBy: user.id,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(PinnedMessagePolicy.canCreate(payload.channelId)),
								)

								const txid = yield* generateTransactionId()

								return { createdPinnedMessage, txid }
							}),
						)
						.pipe(withRemapDbErrors("PinnedMessage", "create"))

					return {
						data: createdPinnedMessage,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedPinnedMessage, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const updatedPinnedMessage = yield* PinnedMessageRepo.update({
									id: path.id,
									...payload,
								}).pipe(policyUse(PinnedMessagePolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId()

								return { updatedPinnedMessage, txid }
							}),
						)
						.pipe(withRemapDbErrors("PinnedMessage", "update"))

					return {
						data: updatedPinnedMessage,
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
								yield* PinnedMessageRepo.deleteById(path.id).pipe(
									policyUse(PinnedMessagePolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId()

								return { txid }
							}),
						)
						.pipe(withRemapDbErrors("PinnedMessage", "delete"))

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
