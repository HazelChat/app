import { Database } from "@hazel/db"
import { policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { InvitationPolicy } from "../../policies/invitation-policy"
import { InvitationRepo } from "../../repositories/invitation-repo"
import { InvitationRpcs } from "../groups/invitations"

/**
 * Invitation RPC Handlers
 *
 * Implements the business logic for all invitation-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const InvitationRpcLive = InvitationRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			/**
			 * InvitationCreate Handler
			 *
			 * Creates a new invitation to an organization. Checks permissions via
			 * InvitationPolicy.canCreate to ensure the user can invite others to
			 * the organization.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Create invitation
			 * 3. Check permissions via InvitationPolicy.canCreate
			 * 4. Generate transaction ID for optimistic updates
			 * 5. Return invitation data and transaction ID
			 */
			"invitation.create": (payload) =>
				db
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
					.pipe(
						Effect.map(({ createdInvitation, txid }) => ({
							data: createdInvitation,
							transactionId: txid,
						})),
					),

			/**
			 * InvitationUpdate Handler
			 *
			 * Updates an existing invitation. Only the invitation creator or users
			 * with appropriate permissions can update invitations.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update invitation
			 * 3. Check permissions via InvitationPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated invitation data and transaction ID
			 */
			"invitation.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedInvitation = yield* InvitationRepo.update({
								id,
								...payload,
							})

							const txid = yield* generateTransactionId()

							return { updatedInvitation, txid }
						}),
					)
					.pipe(
						policyUse(InvitationPolicy.canUpdate(id)),
						withRemapDbErrors("Invitation", "update"),
					)
					.pipe(
						Effect.map(({ updatedInvitation, txid }) => ({
							data: updatedInvitation,
							transactionId: txid,
						})),
					),

			/**
			 * InvitationDelete Handler
			 *
			 * Deletes an invitation. Only the invitation creator or users with
			 * appropriate permissions can delete invitations.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete invitation
			 * 3. Check permissions via InvitationPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			"invitation.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* InvitationRepo.deleteById(id)

							const txid = yield* generateTransactionId()

							return { txid }
						}),
					)
					.pipe(
						policyUse(InvitationPolicy.canDelete(id)),
						withRemapDbErrors("Invitation", "delete"),
					)
					.pipe(Effect.map(({ txid }) => ({ transactionId: txid }))),
		}
	}),
)
