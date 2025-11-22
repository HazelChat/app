import { Database } from "@hazel/db"
import { CurrentUser, InternalServerError, policyUse, withRemapDbErrors } from "@hazel/domain"
import {
	InvitationBatchResponse,
	InvitationBatchResult,
	InvitationNotFoundError,
	InvitationRpcs,
} from "@hazel/domain/rpc"
import { Effect, Option } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { InvitationPolicy } from "../../policies/invitation-policy"
import { InvitationRepo } from "../../repositories/invitation-repo"
import { WorkOS } from "../../services/workos"

export const InvitationRpcLive = InvitationRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database
		const workos = yield* WorkOS

		return {
			"invitation.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const currentUser = yield* CurrentUser.Context

							// Get WorkOS organization
							const workosOrg = yield* workos
								.call((client) =>
									client.organizations.getOrganizationByExternalId(payload.organizationId),
								)
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to get organization from WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							// Process each invite
							const results = yield* Effect.forEach(
								payload.invites,
								(invite) =>
									Effect.gen(function* () {
										// Send invitation via WorkOS
										const workosInvitation = yield* workos
											.call((client) =>
												client.userManagement.sendInvitation({
													email: invite.email,
													organizationId: workosOrg.id,
													roleSlug: invite.role,
												}),
											)
											.pipe(
												Effect.mapError((error) => ({
													message: "Failed to create invitation in WorkOS",
													detail: String(error.cause),
												})),
											)

										// Calculate expiration (7 days from now, matching WorkOS default)
										const expiresAt = new Date()
										expiresAt.setDate(expiresAt.getDate() + 7)

										// Store invitation in local database
										const createdInvitation = yield* InvitationRepo.upsertByWorkosId({
											workosInvitationId: workosInvitation.id,
											organizationId: payload.organizationId,
											invitationUrl: workosInvitation.acceptInvitationUrl,
											email: invite.email,
											invitedBy: currentUser.id,
											invitedAt: new Date(),
											expiresAt,
											status: "pending",
											acceptedAt: null,
											acceptedBy: null,
										}).pipe(policyUse(InvitationPolicy.canCreate(payload.organizationId)))

										const txid = yield* generateTransactionId()

										return new InvitationBatchResult({
											email: invite.email,
											success: true,
											data: createdInvitation,
											transactionId: txid,
										})
									}).pipe(
										Effect.catchAll((error) =>
											Effect.succeed(
												new InvitationBatchResult({
													email: invite.email,
													success: false,
													error:
														typeof error === "object" &&
														error !== null &&
														"message" in error
															? String(error.message)
															: String(error),
												}),
											),
										),
									),
								{
									concurrency: 3,
								},
							)

							const successCount = results.filter((r) => r.success).length
							const errorCount = results.filter((r) => !r.success).length

							return new InvitationBatchResponse({ results, successCount, errorCount })
						}),
					)
					.pipe(withRemapDbErrors("Invitation", "create")),

			"invitation.resend": ({ invitationId }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const invitationOption = yield* InvitationRepo.findById(invitationId).pipe(
								policyUse(InvitationPolicy.canRead(invitationId)),
							)
							if (Option.isNone(invitationOption)) {
								return yield* Effect.fail(new InvitationNotFoundError({ invitationId }))
							}

							const invitation = invitationOption.value

							// Resend invitation via WorkOS (send new invitation to same email)
							yield* workos
								.call((client) =>
									client.userManagement.sendInvitation({
										email: invitation.email,
										organizationId: invitation.organizationId,
									}),
								)
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to resend invitation in WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							const txid = yield* generateTransactionId()

							return { invitation, txid }
						}),
					)
					.pipe(
						policyUse(InvitationPolicy.canUpdate(invitationId)),
						withRemapDbErrors("Invitation", "update"),
						Effect.map(({ invitation, txid }) => ({
							data: invitation,
							transactionId: txid,
						})),
					),

			"invitation.revoke": ({ invitationId }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const invitationOption = yield* InvitationRepo.findById(invitationId).pipe(
								policyUse(InvitationPolicy.canRead(invitationId)),
							)

							if (Option.isNone(invitationOption)) {
								return yield* Effect.fail(new InvitationNotFoundError({ invitationId }))
							}

							const invitation = invitationOption.value

							// Revoke invitation via WorkOS
							yield* workos
								.call((client) =>
									client.userManagement.revokeInvitation(invitation.workosInvitationId),
								)
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to revoke invitation in WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							yield* InvitationRepo.updateStatus(invitationId, "revoked").pipe(
								policyUse(InvitationPolicy.canUpdate(invitationId)),
							)

							const txid = yield* generateTransactionId()

							return { txid }
						}),
					)
					.pipe(
						withRemapDbErrors("Invitation", "delete"),
						Effect.map(({ txid }) => ({ transactionId: txid })),
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
						Effect.map(({ txid }) => ({ transactionId: txid })),
					),
		}
	}),
)
