import { type ChannelId, type ChannelMemberId, policy, UnauthorizedError } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class ChannelMemberPolicy extends Effect.Service<ChannelMemberPolicy>()("ChannelMemberPolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "ChannelMember" as const

		const channelMemberRepo = yield* ChannelMemberRepo
		const channelRepo = yield* ChannelRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo

		const isOwner = (id: ChannelMemberId) =>
			UnauthorizedError.refail(
				policyEntity,
				"isOwner",
			)(
				channelMemberRepo.with(id, (member) =>
					policy(
						policyEntity,
						"isOwner",
						Effect.fn(`${policyEntity}.isOwner`)(function* (actor) {
							return yield* Effect.succeed(actor.id === member.userId)
						}),
					),
				),
			)

		const canCreate = (channelId: ChannelId) =>
			UnauthorizedError.refail(
				policyEntity,
				"create",
			)(
				channelRepo.with(channelId, (channel) =>
					policy(
						policyEntity,
						"create",
						Effect.fn(`${policyEntity}.create`)(function* (actor) {
							// Check if user is an admin of the organization
							const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
								channel.organizationId,
								actor.id,
							)

							if (Option.isSome(orgMember) && orgMember.value.role === "admin") {
								return yield* Effect.succeed(true)
							}

							// For public channels, any org member can join
							if (channel.type === "public" && Option.isSome(orgMember)) {
								return yield* Effect.succeed(true)
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canUpdate = (id: ChannelMemberId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				channelMemberRepo.with(id, (member) =>
					channelRepo.with(member.channelId, (channel) =>
						policy(
							policyEntity,
							"update",
							Effect.fn(`${policyEntity}.update`)(function* (actor) {
								// Members can update their own membership (e.g., mute, hide, favorite)
								if (actor.id === member.userId) {
									return yield* Effect.succeed(true)
								}

								// Organization admins can update any membership
								const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
									channel.organizationId,
									actor.id,
								)

								if (Option.isSome(orgMember) && orgMember.value.role === "admin") {
									return yield* Effect.succeed(true)
								}

								return yield* Effect.succeed(false)
							}),
						),
					),
				),
			)

		const canDelete = (id: ChannelMemberId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				channelMemberRepo.with(id, (member) =>
					channelRepo.with(member.channelId, (channel) =>
						policy(
							policyEntity,
							"delete",
							Effect.fn(`${policyEntity}.delete`)(function* (actor) {
								// Members can leave channels themselves
								if (actor.id === member.userId) {
									return yield* Effect.succeed(true)
								}

								// Organization admins can remove members
								const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
									channel.organizationId,
									actor.id,
								)

								if (Option.isSome(orgMember) && orgMember.value.role === "admin") {
									return yield* Effect.succeed(true)
								}

								return yield* Effect.succeed(false)
							}),
						),
					),
				),
			)

		return { canCreate, canUpdate, canDelete, isOwner } as const
	}),
	dependencies: [ChannelMemberRepo.Default, ChannelRepo.Default, OrganizationMemberRepo.Default],
	accessors: true,
}) {}
