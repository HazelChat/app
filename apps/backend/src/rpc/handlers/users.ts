import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { UserPolicy } from "../../policies/user-policy"
import { UserRepo } from "../../repositories/user-repo"
import { UserRpcs } from "../groups/users"

/**
 * User RPC Handlers
 *
 * Implements the business logic for all user-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const UserRpcLive = UserRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"user.me": () => CurrentUser.Context,

			"user.create": (payload) =>
				db
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

							return {
								data: createdUser,
								transactionId: txid,
							}
						}),
					)
					.pipe(withRemapDbErrors("User", "create")),

			"user.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedUser = yield* UserRepo.update({
								id,
								...payload,
							}).pipe(policyUse(UserPolicy.canUpdate(id)))

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
							yield* UserRepo.deleteById(id).pipe(policyUse(UserPolicy.canDelete(id)))

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("User", "delete")),
		}
	}),
)
