import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { OrganizationMemberPolicy } from "../../policies/organization-member-policy"
import { OrganizationMemberRepo } from "../../repositories/organization-member-repo"
import { OrganizationMemberRpcs } from "../groups/organization-members"

/**
 * Organization Member RPC Handlers
 *
 * Implements the business logic for all organization member-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const OrganizationMemberRpcLive = OrganizationMemberRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			"organizationMember.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const createdOrganizationMember = yield* OrganizationMemberRepo.insert({
								...payload,
								userId: user.id,
								deletedAt: null,
							}).pipe(Effect.map((res) => res[0]!))

							const txid = yield* generateTransactionId()

							return {
								data: createdOrganizationMember,
								transactionId: txid,
							}
						}),
					)
					.pipe(
						policyUse(OrganizationMemberPolicy.canCreate(payload.organizationId)),
						withRemapDbErrors("OrganizationMember", "create"),
					),

			"organizationMember.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedOrganizationMember = yield* OrganizationMemberRepo.update({
								id,
								...payload,
							})

							const txid = yield* generateTransactionId()

							return {
								data: updatedOrganizationMember,
								transactionId: txid,
							}
						}),
					)
					.pipe(
						policyUse(OrganizationMemberPolicy.canUpdate(id)),
						withRemapDbErrors("OrganizationMember", "update"),
					),

			"organizationMember.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* OrganizationMemberRepo.deleteById(id).pipe(
								policyUse(OrganizationMemberPolicy.canDelete(id)),
							)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(
						Effect.catchTags({
							DatabaseError: (err) =>
								Effect.fail(
									new InternalServerError({
										message: "Error Deleting Organization Member",
										cause: err,
									}),
								),
						}),
					),
		}
	}),
)
