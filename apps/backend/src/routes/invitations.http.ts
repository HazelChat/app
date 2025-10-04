import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { InvitationPolicy } from "../policies/invitation-policy"
import { InvitationRepo } from "../repositories/invitation-repo"

export const HttpInvitationLive = HttpApiBuilder.group(HazelApi, "invitations", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const { createdInvitation, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const createdInvitation = yield* InvitationRepo.insert({
									...payload,
								}).pipe(Effect.map((res) => res[0]!))

								const txid = yield* generateTransactionId()

								return { createdInvitation, txid }
							}),
						)
						.pipe(
							policyUse(InvitationPolicy.canCreate(payload.organizationId)),
							withRemapDbErrors("Invitation", "create"),
						)

					return {
						data: createdInvitation,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedInvitation, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const updatedInvitation = yield* InvitationRepo.update({
									id: path.id,
									...payload,
								})

								const txid = yield* generateTransactionId()

								return { updatedInvitation, txid }
							}),
						)
						.pipe(
							policyUse(InvitationPolicy.canUpdate(path.id)),
							withRemapDbErrors("Invitation", "update"),
						)

					return {
						data: updatedInvitation,
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
								yield* InvitationRepo.deleteById(path.id)

								const txid = yield* generateTransactionId()

								return { txid }
							}),
						)
						.pipe(
							policyUse(InvitationPolicy.canDelete(path.id)),
							withRemapDbErrors("Invitation", "delete"),
						)

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
