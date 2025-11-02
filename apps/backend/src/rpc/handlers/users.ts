import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { UserPolicy } from "../../policies/user-policy"
import { UserRepo } from "../../repositories/user-repo"
import { WorkOS } from "../../services/workos"
import { UserNotFoundError, UserRpcs } from "../groups/users"

export const UserRpcLive = UserRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database
		const workos = yield* WorkOS

		return {
			"user.me": () => CurrentUser.Context,

			"user.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedUser = yield* UserRepo.update({
								id,
								...payload,
							}).pipe(policyUse(UserPolicy.canUpdate(id)))

							yield* workos
								.call((client) =>
									client.userManagement.updateUser({
										userId: updatedUser.externalId,
										firstName: payload.firstName,
										lastName: payload.lastName,
									}),
								)
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to update user in WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							const txid = yield* generateTransactionId()

							return {
								data: updatedUser,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("User", "update")),

			"user.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const userOption = yield* UserRepo.findById(id).pipe(
								policyUse(UserPolicy.canRead(id)),
							)

							const user = yield* Option.match(userOption, {
								onNone: () => Effect.fail(new UserNotFoundError({ userId: id })),
								onSome: (user) => Effect.succeed(user),
							})

							yield* UserRepo.deleteById(id).pipe(policyUse(UserPolicy.canDelete(id)))

							yield* workos
								.call((client) => client.userManagement.deleteUser(user.externalId))
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to delete user in WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("User", "delete")),
		}
	}),
)
