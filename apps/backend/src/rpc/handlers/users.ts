import { Database } from "@hazel/db"
import { policyUse, withRemapDbErrors } from "@hazel/effect-lib"
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
			/**
			 * UserCreate Handler
			 *
			 * Creates a new user. Only users with appropriate permissions
			 * can create new users.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Create user with provided data
			 * 3. Check permissions via UserPolicy.canCreate
			 * 4. Generate transaction ID for optimistic updates
			 * 5. Return user data and transaction ID
			 */
			UserCreate: (payload) =>
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

			/**
			 * UserUpdate Handler
			 *
			 * Updates an existing user. Only users with appropriate permissions
			 * can update user data.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update user
			 * 3. Check permissions via UserPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated user data and transaction ID
			 */
			UserUpdate: ({ id, ...payload }) =>
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

			/**
			 * UserDelete Handler
			 *
			 * Deletes a user (soft delete). Only users with appropriate
			 * permissions can delete users.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete user (sets deletedAt timestamp)
			 * 3. Check permissions via UserPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			UserDelete: ({ id }) =>
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
