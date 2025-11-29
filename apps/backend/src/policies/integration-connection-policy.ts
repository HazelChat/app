import { type OrganizationId, policy, UnauthorizedError, withSystemActor } from "@hazel/domain"
import { Effect, Option } from "effect"
import { isAdminOrOwner } from "../lib/policy-utils"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class IntegrationConnectionPolicy extends Effect.Service<IntegrationConnectionPolicy>()(
	"IntegrationConnectionPolicy/Policy",
	{
		effect: Effect.gen(function* () {
			const policyEntity = "IntegrationConnection" as const

			const orgMemberRepo = yield* OrganizationMemberRepo

			// For select, any org member can view integrations
			const canSelect = (organizationId: OrganizationId) =>
				UnauthorizedError.refail(
					policyEntity,
					"select",
				)(
					policy(
						policyEntity,
						"select",
						Effect.fn(`${policyEntity}.select`)(function* (actor) {
							const currentMember = yield* orgMemberRepo
								.findByOrgAndUser(organizationId, actor.id)
								.pipe(withSystemActor)

							return yield* Effect.succeed(Option.isSome(currentMember))
						}),
					),
				)

			// For insert, only admins and owners can connect integrations
			const canInsert = (organizationId: OrganizationId) =>
				UnauthorizedError.refail(
					policyEntity,
					"insert",
				)(
					policy(
						policyEntity,
						"insert",
						Effect.fn(`${policyEntity}.insert`)(function* (actor) {
							const currentMember = yield* orgMemberRepo
								.findByOrgAndUser(organizationId, actor.id)
								.pipe(withSystemActor)

							if (Option.isNone(currentMember)) {
								return yield* Effect.succeed(false)
							}

							return yield* Effect.succeed(isAdminOrOwner(currentMember.value.role))
						}),
					),
				)

			// For update, only admins and owners can modify integrations
			const canUpdate = (organizationId: OrganizationId) =>
				UnauthorizedError.refail(
					policyEntity,
					"update",
				)(
					policy(
						policyEntity,
						"update",
						Effect.fn(`${policyEntity}.update`)(function* (actor) {
							const currentMember = yield* orgMemberRepo
								.findByOrgAndUser(organizationId, actor.id)
								.pipe(withSystemActor)

							if (Option.isNone(currentMember)) {
								return yield* Effect.succeed(false)
							}

							return yield* Effect.succeed(isAdminOrOwner(currentMember.value.role))
						}),
					),
				)

			// For delete, only admins and owners can disconnect integrations
			const canDelete = (organizationId: OrganizationId) =>
				UnauthorizedError.refail(
					policyEntity,
					"delete",
				)(
					policy(
						policyEntity,
						"delete",
						Effect.fn(`${policyEntity}.delete`)(function* (actor) {
							const currentMember = yield* orgMemberRepo
								.findByOrgAndUser(organizationId, actor.id)
								.pipe(withSystemActor)

							if (Option.isNone(currentMember)) {
								return yield* Effect.succeed(false)
							}

							return yield* Effect.succeed(isAdminOrOwner(currentMember.value.role))
						}),
					),
				)

			return { canSelect, canInsert, canUpdate, canDelete } as const
		}),
		dependencies: [OrganizationMemberRepo.Default],
		accessors: true,
	},
) {}
