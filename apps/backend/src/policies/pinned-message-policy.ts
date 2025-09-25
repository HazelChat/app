import { type ChannelId, type PinnedMessageId, policy, UnauthorizedError } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"
import { PinnedMessageRepo } from "../repositories/pinned-message-repo"

export class PinnedMessagePolicy extends Effect.Service<PinnedMessagePolicy>()("PinnedMessagePolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "PinnedMessage" as const

		const pinnedMessageRepo = yield* PinnedMessageRepo
		const channelRepo = yield* ChannelRepo
		const _channelMemberRepo = yield* ChannelMemberRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo

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
							// Check if user is an org member
							const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
								channel.organizationId,
								actor.id,
							)

							if (Option.isNone(orgMember)) {
								return yield* Effect.succeed(false)
							}

							// Org admins can pin messages in any channel
							if (orgMember.value.role === "admin") {
								return yield* Effect.succeed(true)
							}

							// Regular members can pin in public channels
							if (channel.type === "public") {
								return yield* Effect.succeed(true)
							}

							// In private channels, restrict pinning to admins only
							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canDelete = (id: PinnedMessageId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				pinnedMessageRepo.with(id, (pinnedMessage) =>
					channelRepo.with(pinnedMessage.channelId, (channel) =>
						policy(
							policyEntity,
							"delete",
							Effect.fn(`${policyEntity}.delete`)(function* (actor) {
								// User who pinned can unpin
								if (actor.id === pinnedMessage.pinnedBy) {
									return yield* Effect.succeed(true)
								}

								// Organization admins can unpin any message
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

		return { canCreate, canDelete } as const
	}),
	dependencies: [
		PinnedMessageRepo.Default,
		ChannelRepo.Default,
		ChannelMemberRepo.Default,
		OrganizationMemberRepo.Default,
	],
	accessors: true,
}) {}
