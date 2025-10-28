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
