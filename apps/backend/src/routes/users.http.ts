import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { UserPolicy } from "../policies/user-policy"
import { UserRepo } from "../repositories/user-repo"

export const HttpUserLive = HttpApiBuilder.group(HazelApi, "users", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"me",
				Effect.fn(function* () {
					const currentUser = yield* CurrentUser.Context

					return currentUser
				}),
			)
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const { createdUser, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const createdUser = yield* UserRepo.insert({
									...payload,
									deletedAt: null,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(UserPolicy.canCreate()),
								)

								const txid = yield* generateTransactionId()

								return { createdUser, txid }
							}),
						)
						.pipe(withRemapDbErrors("User", "create"))

					return {
						data: createdUser,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedUser, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const updatedUser = yield* UserRepo.update({
									id: path.id,
									...payload,
								}).pipe(policyUse(UserPolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId()

								return { updatedUser, txid }
							}),
						)
						.pipe(withRemapDbErrors("User", "update"))

					return {
						data: updatedUser,
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
								yield* UserRepo.deleteById(path.id).pipe(
									policyUse(UserPolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId()

								return { txid }
							}),
						)
						.pipe(withRemapDbErrors("User", "delete"))

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
