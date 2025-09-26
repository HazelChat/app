import { type OrganizationId, policy, UnauthorizedError, type UserId } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class OrganizationPolicy extends Effect.Service<OrganizationPolicy>()("OrganizationPolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Organization" as const

		const organziationMemberRepo = yield* OrganizationMemberRepo

		const canCreate = () =>
			UnauthorizedError.refail(
				policyEntity,
				"create",
			)(policy(policyEntity, "create", (_actor) => Effect.succeed(true)))

		const canUpdate = (id: OrganizationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				policy(
					policyEntity,
					"update",
					Effect.fn(`${policyEntity}.update`)(function* (actor) {
						const currentMember = yield* organziationMemberRepo.findByOrgAndUser(id, actor.id)

						if (Option.isNone(currentMember)) {
							return yield* Effect.succeed(false)
						}

						const currentMemberValue = currentMember.value

						return yield* Effect.succeed(currentMemberValue.role === "admin")
					}),
				),
			)

		const canDelete = (id: OrganizationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				policy(
					policyEntity,
					"delete",
					Effect.fn(`${policyEntity}.delete`)(function* (actor) {
						const currentMember = yield* organziationMemberRepo.findByOrgAndUser(id, actor.id)

						if (Option.isNone(currentMember)) {
							return yield* Effect.succeed(false)
						}

						const currentMemberValue = currentMember.value

						return yield* Effect.succeed(currentMemberValue.role === "admin")
					}),
				),
			)

		return { canUpdate, canDelete, canCreate } as const
	}),
	dependencies: [OrganizationMemberRepo.Default],
	accessors: true,
}) {}
