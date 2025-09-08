import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { CurrentUser } from "../lib/auth"
import { generateTransactionId } from "../lib/create-transactionId"
import { InternalServerError } from "../lib/errors"
import { DirectMessageParticipantRepo } from "../repositories/direct-message-participant-repo"

export const HttpDirectMessageParticipantLive = HttpApiBuilder.group(
	HazelApi,
	"directMessageParticipants",
	(handlers) =>
		Effect.gen(function* () {
			const db = yield* Database.Database

			return handlers
				.handle(
					"create",
					Effect.fn(function* ({ payload }) {
						const user = yield* CurrentUser

						const { createdDirectMessageParticipant, txid } = yield* db
							.transaction(
								Effect.fnUntraced(function* (tx) {
									const createdDirectMessageParticipant =
										yield* DirectMessageParticipantRepo.insert({
											...payload,
											userId: user.id,
										}).pipe(Effect.map((res) => res[0]!))

									const txid = yield* generateTransactionId(tx)

									return { createdDirectMessageParticipant, txid }
								}),
							)
							.pipe(
								Effect.catchTags({
									DatabaseError: (err) =>
										new InternalServerError({
											message: "Error Creating Direct Message Participant",
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
							data: createdDirectMessageParticipant,
							transactionId: txid,
						}
					}),
				)
				.handle(
					"update",
					Effect.fn(function* ({ payload, path }) {
						const { updatedDirectMessageParticipant, txid } = yield* db
							.transaction(
								Effect.fnUntraced(function* (tx) {
									const updatedDirectMessageParticipant =
										yield* DirectMessageParticipantRepo.update({
											id: path.id,
											...payload,
										})

									const txid = yield* generateTransactionId(tx)

									return { updatedDirectMessageParticipant, txid }
								}),
							)
							.pipe(
								Effect.catchTags({
									DatabaseError: (err) =>
										new InternalServerError({
											message: "Error Updating Direct Message Participant",
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
							data: updatedDirectMessageParticipant,
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
									yield* DirectMessageParticipantRepo.deleteById(path.id)

									const txid = yield* generateTransactionId(tx)

									return { txid }
								}),
							)
							.pipe(
								Effect.catchTags({
									DatabaseError: (err) =>
										new InternalServerError({
											message: "Error Deleting Direct Message Participant",
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
