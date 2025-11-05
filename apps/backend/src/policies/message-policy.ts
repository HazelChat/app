import { type ChannelId, type MessageId, policy, UnauthorizedError, withSystemActor } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { isAdminOrOwner } from "../lib/policy-utils"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { MessageRepo } from "../repositories/message-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class MessagePolicy extends Effect.Service<MessagePolicy>()("MessagePolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Message" as const

		const messageRepo = yield* MessageRepo
		const channelMemberRepo = yield* ChannelMemberRepo
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
							// Check if user is a member of the organization
							const orgMember = yield* organizationMemberRepo
								.findByOrgAndUser(channel.organizationId, actor.id)
								.pipe(withSystemActor)

							// Handle based on channel type
							if (channel.type === "public") {
								// Org members can post in public channels
								return Option.isSome(orgMember)
							}

							if (channel.type === "private") {
								// Check if user is a channel member or org admin
								if (Option.isSome(orgMember) && isAdminOrOwner(orgMember.value.role)) {
									return true
								}

								const channelMembership = yield* channelMemberRepo
									.findByChannelAndUser(channelId, actor.id)
									.pipe(withSystemActor)

								return Option.isSome(channelMembership)
							}

							if (channel.type === "direct" || channel.type === "single") {
								// Check if user is a channel member
								const channelMembership = yield* channelMemberRepo
									.findByChannelAndUser(channelId, actor.id)
									.pipe(withSystemActor)

								return Option.isSome(channelMembership)
							}

							if (channel.type === "thread") {
								// Threads inherit permissions from parent channel
								if (channel.parentChannelId) {
									// Check parent channel - get parent channel and check its type
									const parentChannel = yield* channelRepo
										.findById(channel.parentChannelId)
										.pipe(withSystemActor)

									if (Option.isNone(parentChannel)) {
										return false
									}

									const parent = parentChannel.value

									// Check parent channel permissions based on its type
									if (parent.type === "public") {
										return Option.isSome(orgMember)
									}

									if (parent.type === "private") {
										if (Option.isSome(orgMember) && orgMember.value.role === "admin") {
											return true
										}

										const parentMembership = yield* channelMemberRepo
											.findByChannelAndUser(parent.id, actor.id)
											.pipe(withSystemActor)

										return Option.isSome(parentMembership)
									}

									if (parent.type === "direct" || parent.type === "single") {
										const parentMembership = yield* channelMemberRepo
											.findByChannelAndUser(parent.id, actor.id)
											.pipe(withSystemActor)

										return Option.isSome(parentMembership)
									}

									if (parent.type === "thread") {
										// Nested threads not supported - deny
										return false
									}

									// Unknown parent type - deny
									return false
								}
								// Thread without parent - deny
								return false
							}

							return false
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
