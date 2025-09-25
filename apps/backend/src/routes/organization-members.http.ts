import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export const HttpOrganizationMemberLive = HttpApiBuilder.group(HazelApi, "organizationMembers", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser.Context

					const { createdOrganizationMember, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdOrganizationMember = yield* OrganizationMemberRepo.insert({
									...payload,
									userId: user.id,
									deletedAt: null,
								}).pipe(Effect.map((res) => res[0]!))

								const txid = yield* generateTransactionId(tx)

								return { createdOrganizationMember, txid }
							}),
						)
						.pipe(withRemapDbErrors("OrganizationMemberRepo", "create"))

					return {
						data: createdOrganizationMember,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedOrganizationMember, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const updatedOrganizationMember = yield* OrganizationMemberRepo.update({
									id: path.id,
									...payload,
								})

								const txid = yield* generateTransactionId(tx)

								return { updatedOrganizationMember, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Updating Organization Member",
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
						data: updatedOrganizationMember,
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
								yield* OrganizationMemberRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Deleting Organization Member",
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
