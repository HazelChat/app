import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { Effect, Option } from "effect"
import { HazelApi, TypingIndicatorNotFoundError } from "../api"
import { CurrentUser } from "../lib/auth"
import { generateTransactionId } from "../lib/create-transactionId"
import { InternalServerError } from "../lib/errors"
import { TypingIndicatorRepo } from "../repositories/typing-indicator-repo"

export const HttpTypingIndicatorLive = HttpApiBuilder.group(HazelApi, "typingIndicators", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const _user = yield* CurrentUser

					// TODO: Verify the user has permission to type in this channel
					// This would typically check channel membership, organization membership, etc.

					const { typingIndicator, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								// First, delete any existing typing indicator for this user in this channel
								yield* TypingIndicatorRepo.deleteByChannelAndMember({
									channelId: payload.channelId,
									memberId: payload.memberId,
								})

								// Then create a new one with current timestamp
								const typingIndicator = yield* TypingIndicatorRepo.insert({
									...payload,
									lastTyped: Date.now(),
								}).pipe(Effect.map((res) => res[0]!))

								const txid = yield* generateTransactionId(tx)

								return { typingIndicator, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Typing Indicator",
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
						data: typingIndicator,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const _user = yield* CurrentUser

					// TODO: Verify the user has permission to type in this channel

					const { typingIndicator, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const typingIndicator = yield* TypingIndicatorRepo.update({
									...payload,
									id: path.id,
									lastTyped: Date.now(),
								})

								const txid = yield* generateTransactionId(tx)

								return { typingIndicator, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Updating Typing Indicator",
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
						data: typingIndicator,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const _user = yield* CurrentUser

					return yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								// First find the typing indicator to return it
								const existingOption = yield* TypingIndicatorRepo.findById(path.id)

								if (Option.isNone(existingOption)) {
									return yield* Effect.fail(
										new TypingIndicatorNotFoundError({ typingIndicatorId: path.id }),
									)
								}

								const existing = existingOption.value

								// Delete it
								yield* TypingIndicatorRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { data: existing, transactionId: txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									Effect.fail(
										new InternalServerError({
											message: "Error Deleting Typing Indicator",
											cause: err,
										}),
									),
							}),
						)
				}),
			)
	}),
)
