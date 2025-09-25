import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { DirectMessageParticipantPolicy } from "../policies/direct-message-participant-policy"
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
						const user = yield* CurrentUser.Context

						const { createdDirectMessageParticipant, txid } = yield* db
							.transaction(
								Effect.fnUntraced(function* (tx) {
									const createdDirectMessageParticipant =
										yield* DirectMessageParticipantRepo.insert({
											...payload,
											userId: user.id,
										}).pipe(
											Effect.map((res) => res[0]!),
											policyUse(
												DirectMessageParticipantPolicy.canCreate(payload.channelId),
											),
										)

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
										}).pipe(policyUse(DirectMessageParticipantPolicy.canUpdate(path.id)))

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
									yield* DirectMessageParticipantRepo.deleteById(path.id).pipe(
										policyUse(DirectMessageParticipantPolicy.canDelete(path.id)),
									)

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
