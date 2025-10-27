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
			/**
			 * OrganizationMemberCreate Handler
			 *
			 * Adds a user to an organization. The userId is automatically set
			 * from the authenticated user. Checks permissions via
			 * OrganizationMemberPolicy.canCreate.
			 *
			 * Process:
			 * 1. Get current user from context (provided by AuthMiddleware)
			 * 2. Start database transaction
			 * 3. Create organization member with userId set to current user
			 * 4. Check permissions via OrganizationMemberPolicy.canCreate
			 * 5. Generate transaction ID for optimistic updates
			 * 6. Return organization member data and transaction ID
			 */
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

			/**
			 * OrganizationMemberUpdate Handler
			 *
			 * Updates an existing organization member's role and settings.
			 * Only users with appropriate permissions can update organization members.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update organization member
			 * 3. Check permissions via OrganizationMemberPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated organization member data and transaction ID
			 */
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

			/**
			 * OrganizationMemberDelete Handler
			 *
			 * Removes a user from an organization (soft delete). Only users with
			 * appropriate permissions can remove organization members.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete organization member (sets deletedAt timestamp)
			 * 3. Check permissions via OrganizationMemberPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
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
