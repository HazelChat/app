import {
	type ChannelId,
	type PinnedMessageId,
	policy,
	UnauthorizedError,
	withSystemActor,
} from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { isAdminOrOwner } from "../lib/policy-utils"
import { ChannelRepo } from "../repositories/channel-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"
import { PinnedMessageRepo } from "../repositories/pinned-message-repo"

export class PinnedMessagePolicy extends Effect.Service<PinnedMessagePolicy>()("PinnedMessagePolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "PinnedMessage" as const

		const pinnedMessageRepo = yield* PinnedMessageRepo
		const channelRepo = yield* ChannelRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo

		const canUpdate = (id: PinnedMessageId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				pinnedMessageRepo.with(id, (pinnedMessage) =>
					channelRepo.with(pinnedMessage.channelId, (channel) =>
						policy(
							policyEntity,
							"update",
							Effect.fn(`${policyEntity}.update`)(function* (actor) {
								// User who pinned can update
								if (actor.id === pinnedMessage.pinnedBy) {
									return yield* Effect.succeed(true)
								}

								// Organization admins can update any message
								const orgMember = yield* organizationMemberRepo
									.findByOrgAndUser(channel.organizationId, actor.id)
									.pipe(withSystemActor)

								if (Option.isSome(orgMember) && isAdminOrOwner(orgMember.value.role)) {
									return yield* Effect.succeed(true)
								}

								return yield* Effect.succeed(false)
							}),
						),
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
							// Check if user is an org member
							const orgMember = yield* organizationMemberRepo
								.findByOrgAndUser(channel.organizationId, actor.id)
								.pipe(withSystemActor)

							if (Option.isNone(orgMember)) {
								return yield* Effect.succeed(false)
							}

							// Org admins/owners can pin messages in any channel
							if (isAdminOrOwner(orgMember.value.role)) {
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

								// Organization admins/owners can unpin any message
								const orgMember = yield* organizationMemberRepo
									.findByOrgAndUser(channel.organizationId, actor.id)
									.pipe(withSystemActor)

								if (Option.isSome(orgMember) && isAdminOrOwner(orgMember.value.role)) {
									return yield* Effect.succeed(true)
								}

								return yield* Effect.succeed(false)
							}),
						),
					),
				),
			)

		return { canCreate, canDelete, canUpdate } as const
	}),
	dependencies: [PinnedMessageRepo.Default, ChannelRepo.Default, OrganizationMemberRepo.Default],
	accessors: true,
}) {}
