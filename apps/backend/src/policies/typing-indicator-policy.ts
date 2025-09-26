import { type ChannelId, policy, type TypingIndicatorId, UnauthorizedError } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { TypingIndicatorRepo } from "../repositories/typing-indicator-repo"

export class TypingIndicatorPolicy extends Effect.Service<TypingIndicatorPolicy>()(
	"TypingIndicatorPolicy/Policy",
	{
		effect: Effect.gen(function* () {
			const policyEntity = "TypingIndicator" as const

			const channelMemberRepo = yield* ChannelMemberRepo
			const typingIndicatorRepo = yield* TypingIndicatorRepo

			const canCreate = (channelId: ChannelId) =>
				UnauthorizedError.refail(
					policyEntity,
					"create",
				)(
					policy(
						policyEntity,
						"create",
						Effect.fn(`${policyEntity}.create`)(function* (actor) {
							// Check if user is a member of the channel
							const member = yield* channelMemberRepo.findByChannelAndUser(channelId, actor.id)
							return yield* Effect.succeed(Option.isSome(member))
						}),
					),
				)

			const canUpdate = (id: TypingIndicatorId) =>
				UnauthorizedError.refail(
					policyEntity,
					"update",
				)(
					typingIndicatorRepo.with(id, (indicator) =>
						channelMemberRepo.with(indicator.memberId, (member) =>
							policy(
								policyEntity,
								"update",
								// User can only update their own typing indicator
								(actor) => Effect.succeed(actor.id === member.userId),
							),
						),
					),
				)

			const canDelete = (id: TypingIndicatorId) =>
				UnauthorizedError.refail(
					policyEntity,
					"delete",
				)(
					typingIndicatorRepo.with(id, (indicator) =>
						channelMemberRepo.with(indicator.memberId, (member) =>
							policy(
								policyEntity,
								"delete",
								// User can only delete their own typing indicator
								(actor) => Effect.succeed(actor.id === member.userId),
							),
						),
					),
				)

			return { canCreate, canUpdate, canDelete } as const
		}),
		dependencies: [ChannelMemberRepo.Default, TypingIndicatorRepo.Default],
		accessors: true,
	},
) {}
