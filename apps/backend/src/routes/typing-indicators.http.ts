import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { HazelApi, TypingIndicatorNotFoundError } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { TypingIndicatorPolicy } from "../policies/typing-indicator-policy"
import { TypingIndicatorRepo } from "../repositories/typing-indicator-repo"

export const HttpTypingIndicatorLive = HttpApiBuilder.group(HazelApi, "typingIndicators", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const { typingIndicator, txid } = yield* db
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

								return { typingIndicator, txid }
							}),
						)
						.pipe(withRemapDbErrors("TypingIndicator", "create"))

					return {
						data: typingIndicator,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { typingIndicator, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const typingIndicator = yield* TypingIndicatorRepo.update({
									...payload,
									id: path.id,
									lastTyped: Date.now(),
								}).pipe(policyUse(TypingIndicatorPolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId()

								return { typingIndicator, txid }
							}),
						)
						.pipe(withRemapDbErrors("TypingIndicator", "update"))

					return {
						data: typingIndicator,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					return yield* db
						.transaction(
							Effect.gen(function* () {
								// First find the typing indicator to return it
								const existingOption = yield* TypingIndicatorRepo.findById(path.id).pipe(
									policyUse(TypingIndicatorPolicy.canRead(path.id)),
								)

								if (Option.isNone(existingOption)) {
									return yield* Effect.fail(
										new TypingIndicatorNotFoundError({ typingIndicatorId: path.id }),
									)
								}

								const existing = existingOption.value

								yield* TypingIndicatorRepo.deleteById(path.id).pipe(
									policyUse(TypingIndicatorPolicy.canDelete({ id: path.id })),
								)

								const txid = yield* generateTransactionId()

								return { data: existing, transactionId: txid }
							}),
						)
						.pipe(withRemapDbErrors("TypingIndicator", "delete"))
				}),
			)
	}),
)
