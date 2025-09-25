import { type MessageId, type MessageReactionId, policy, UnauthorizedError } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { MessageReactionRepo } from "../repositories/message-reaction-repo"
import { MessageRepo } from "../repositories/message-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class MessageReactionPolicy extends Effect.Service<MessageReactionPolicy>()(
	"MessageReactionPolicy/Policy",
	{
		effect: Effect.gen(function* () {
			const policyEntity = "MessageReaction" as const

			const messageReactionRepo = yield* MessageReactionRepo
			const messageRepo = yield* MessageRepo
			const _channelMemberRepo = yield* ChannelMemberRepo
			const channelRepo = yield* ChannelRepo
			const organizationMemberRepo = yield* OrganizationMemberRepo

			const canCreate = (messageId: MessageId) =>
				UnauthorizedError.refail(
					policyEntity,
					"create",
				)(
					messageRepo.with(messageId, (message) =>
						channelRepo.with(message.channelId, (channel) =>
							policy(
								policyEntity,
								"create",
								Effect.fn(`${policyEntity}.create`)(function* (actor) {
									// For public channels, org members can react
									if (channel.type === "public") {
										const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
											channel.organizationId,
											actor.id,
										)

										if (Option.isSome(orgMember)) {
											return yield* Effect.succeed(true)
										}
									}

									// For private channels, would need to check channel membership
									// Simplified for now - org admins can react anywhere
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

			const canDelete = (id: MessageReactionId) =>
				UnauthorizedError.refail(
					policyEntity,
					"delete",
				)(
					messageReactionRepo.with(id, (reaction) =>
						policy(
							policyEntity,
							"delete",
							Effect.fn(`${policyEntity}.delete`)(function* (actor) {
								// Users can only delete their own reactions
								return yield* Effect.succeed(actor.id === reaction.userId)
							}),
						),
					),
				)

			return { canCreate, canDelete } as const
		}),
		dependencies: [
			MessageReactionRepo.Default,
			MessageRepo.Default,
			ChannelMemberRepo.Default,
			ChannelRepo.Default,
			OrganizationMemberRepo.Default,
		],
		accessors: true,
	},
) {}
