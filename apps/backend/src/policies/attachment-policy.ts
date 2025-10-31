import { type AttachmentId, policy, UnauthorizedError, withSystemActor } from "@hazel/effect-lib"
import { Effect, Option } from "effect"
import { isAdminOrOwner } from "../lib/policy-utils"
import { AttachmentRepo } from "../repositories/attachment-repo"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"
import { MessageRepo } from "../repositories/message-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

export class AttachmentPolicy extends Effect.Service<AttachmentPolicy>()("AttachmentPolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Attachment" as const

		const attachmentRepo = yield* AttachmentRepo
		const messageRepo = yield* MessageRepo
		const channelRepo = yield* ChannelRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo
		const channelMemberRepo = yield* ChannelMemberRepo

		const canCreate = () =>
			UnauthorizedError.refail(
				policyEntity,
				"create",
			)(
				policy(
					policyEntity,
					"create",
					Effect.fn(`${policyEntity}.create`)(function* (_actor) {
						// Any authenticated user can upload attachments initially
						// The actual association with messages is controlled by message policies
						return yield* Effect.succeed(true)
					}),
				),
			)

		const canUpdate = (id: AttachmentId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				attachmentRepo.with(id, (attachment) =>
					policy(
						policyEntity,
						"update",
						Effect.fn(`${policyEntity}.update`)(function* (actor) {
							// Only the uploader can update their attachment metadata
							return yield* Effect.succeed(actor.id === attachment.uploadedBy)
						}),
					),
				),
			)

		const canDelete = (id: AttachmentId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				attachmentRepo.with(id, (attachment) => {
					// If attachment is not yet associated with a message
					if (!attachment.messageId) {
						return policy(
							policyEntity,
							"delete",
							Effect.fn(`${policyEntity}.delete`)(function* (actor) {
								// Only uploader can delete unattached files
								return yield* Effect.succeed(actor.id === attachment.uploadedBy)
							}),
						)
					}

					// If attachment is associated with a message
					return messageRepo.with(attachment.messageId, (message) =>
						channelRepo.with(message.channelId, (channel) =>
							policy(
								policyEntity,
								"delete",
								Effect.fn(`${policyEntity}.delete`)(function* (actor) {
									// Uploader can delete their own attachment
									if (actor.id === attachment.uploadedBy) {
										return yield* Effect.succeed(true)
									}

									// Message author can delete attachments on their message
									if (actor.id === message.authorId) {
										return yield* Effect.succeed(true)
									}

									// Organization admins/owners can delete any attachment
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
					)
				}),
			)

		const canView = (id: AttachmentId) =>
			UnauthorizedError.refail(
				policyEntity,
				"view",
			)(
				attachmentRepo.with(id, (attachment) => {
					// If attachment is not yet associated with a message
					if (!attachment.messageId) {
						return policy(
							policyEntity,
							"view",
							Effect.fn(`${policyEntity}.view`)(function* (actor) {
								// Only uploader can view unattached files
								return yield* Effect.succeed(actor.id === attachment.uploadedBy)
							}),
						)
					}

					// If attachment is associated with a message
					return messageRepo.with(attachment.messageId, (message) =>
						channelRepo.with(message.channelId, (channel) =>
							policy(
								policyEntity,
								"view",
								Effect.fn(`${policyEntity}.view`)(function* (actor) {
									// For public channels, org members can view
									if (channel.type === "public") {
										const orgMember = yield* organizationMemberRepo.findByOrgAndUser(
											channel.organizationId,
											actor.id,
										)

										if (Option.isSome(orgMember)) {
											return yield* Effect.succeed(true)
										}
									}

									// For private channels, check if user is a channel member or org admin
									const orgMember = yield* organizationMemberRepo
										.findByOrgAndUser(channel.organizationId, actor.id)
										.pipe(withSystemActor)

									// Organization admins/owners can view all attachments
									if (Option.isSome(orgMember) && isAdminOrOwner(orgMember.value.role)) {
										return yield* Effect.succeed(true)
									}

									// Check if user is a member of the private channel
									const channelMembership = yield* channelMemberRepo
										.findByChannelAndUser(channel.id, actor.id)
										.pipe(withSystemActor)

									if (Option.isSome(channelMembership)) {
										return yield* Effect.succeed(true)
									}

									return yield* Effect.succeed(false)
								}),
							),
						),
					)
				}),
			)

		return { canCreate, canUpdate, canDelete, canView } as const
	}),
	dependencies: [
		AttachmentRepo.Default,
		MessageRepo.Default,
		ChannelRepo.Default,
		OrganizationMemberRepo.Default,
		ChannelMemberRepo.Default,
	],
	accessors: true,
}) {}
