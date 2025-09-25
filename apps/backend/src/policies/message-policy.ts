import { type ChannelId, type MessageId, policy, policyCompose, UnauthorizedError } from "@hazel/effect-lib"
import { Effect, Option, pipe } from "effect"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { MessageRepo } from "../repositories/message-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class MessagePolicy extends Effect.Service<MessagePolicy>()("MessagePolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Message" as const

		const messageRepo = yield* MessageRepo
		const _channelMemberRepo = yield* ChannelMemberRepo
		const channelRepo = yield* ChannelRepo
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
							// Check if user is a member of the organization (for public channels)
							const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
								channel.organizationId,
								actor.id,
							)

							if (Option.isSome(orgMember)) {
								// Org members can post in public channels
								if (channel.type === "public") {
									return yield* Effect.succeed(true)
								}

								// For private channels, would need to check channel membership
								// Simplified for now - admins can post anywhere
								if (orgMember.value.role === "admin") {
									return yield* Effect.succeed(true)
								}
							}

							return yield* Effect.succeed(false)
						}),
					),
				),
			)

		const canUpdate = (id: MessageId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				messageRepo.with(id, (message) =>
					policy(
						policyEntity,
						"update",
						Effect.fn(`${policyEntity}.update`)(function* (actor) {
							// Only the author can update their own message
							return yield* Effect.succeed(actor.id === message.authorId)
						}),
					),
				),
			)

		const canDelete = (id: MessageId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				messageRepo.with(id, (message) =>
					pipe(
						channelRepo.with(message.channelId, (channel) =>
							policy(
								policyEntity,
								"delete",
								Effect.fn(`${policyEntity}.delete`)(function* (actor) {
									// Author can delete their own message
									if (actor.id === message.authorId) {
										return yield* Effect.succeed(true)
									}

									// Organization admin can delete any message
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
				),
			)

		return { canCreate, canUpdate, canDelete } as const
	}),
	dependencies: [
		MessageRepo.Default,
		ChannelMemberRepo.Default,
		ChannelRepo.Default,
		OrganizationMemberRepo.Default,
	],
	accessors: true,
}) {}
