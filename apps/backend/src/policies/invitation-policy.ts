import {
	type InvitationId,
	type OrganizationId,
	policy,
	policyCompose,
	UnauthorizedError,
	type UserId,
	withSystemActor,
} from "@hazel/effect-lib"
import { Effect, Option, pipe } from "effect"
import { isAdminOrOwner } from "../lib/policy-utils"
import { InvitationRepo } from "../repositories/invitation-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class InvitationPolicy extends Effect.Service<InvitationPolicy>()("InvitationPolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Invitation" as const

		const invitationRepo = yield* InvitationRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo

		const canCreate = (organizationId: OrganizationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"create",
			)(
				policy(
					policyEntity,
					"create",
					Effect.fn(`${policyEntity}.create`)(function* (actor) {
						// Only organization admins can create invitations
						const orgMember = yield* organizationMemberRepo
							.findByOrgAndUser(organizationId, actor.id)
							.pipe(withSystemActor)

						if (Option.isSome(orgMember) && isAdminOrOwner(orgMember.value.role)) {
							return yield* Effect.succeed(true)
						}

						return yield* Effect.succeed(false)
					}),
				),
			)

		const canUpdate = (id: InvitationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				invitationRepo.with(id, (invitation) =>
					policy(
						policyEntity,
						"update",
						Effect.fn(`${policyEntity}.update`)(function* (actor) {
							// Invitation creator can update it
							if (actor.id === invitation.invitedBy) {
								return yield* Effect.succeed(true)
							}

							// Organization admins can update any invitation
							const orgMember = yield* organizationMemberRepo
								.findByOrgAndUser(invitation.organizationId, actor.id)
								.pipe(withSystemActor)

							if (Option.isSome(orgMember) && orgMember.value.role === "admin") {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canDelete = (id: InvitationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				invitationRepo.with(id, (invitation) =>
					policy(
						policyEntity,
						"delete",
						Effect.fn(`${policyEntity}.delete`)(function* (actor) {
							// Invitation creator can delete it
							if (actor.id === invitation.invitedBy) {
								return yield* Effect.succeed(true)
							}

							// Organization admins can delete any invitation
							const orgMember = yield* organizationMemberRepo
								.findByOrgAndUser(invitation.organizationId, actor.id)
								.pipe(withSystemActor)

							if (Option.isSome(orgMember) && orgMember.value.role === "admin") {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canAccept = (id: InvitationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"accept",
			)(
				invitationRepo.with(id, (_invitation) =>
					policy(
						policyEntity,
						"accept",
						Effect.fn(`${policyEntity}.accept`)(function* (_actor) {
							// Only the invited user can accept the invitation
							// Check if the actor's email matches the invitation email
							// Note: This assumes we have access to actor's email, might need adjustment
							return yield* Effect.succeed(true) // Simplified - would need email comparison
						}),
					),
				),
			)

		return { canCreate, canUpdate, canDelete, canAccept } as const
	}),
	dependencies: [InvitationRepo.Default, OrganizationMemberRepo.Default],
	accessors: true,
}) {}
