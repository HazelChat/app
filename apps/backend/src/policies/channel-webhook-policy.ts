import {
	type ChannelId,
	type ChannelWebhookId,
	type OrganizationId,
	policy,
	UnauthorizedError,
	type UserId,
	withSystemActor,
} from "@hazel/domain"
import { Effect, Option } from "effect"
import { isAdminOrOwner } from "../lib/policy-utils"
import { ChannelRepo } from "../repositories/channel-repo"
import { ChannelWebhookRepo } from "../repositories/channel-webhook-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"

/** @effect-leakable-service */
export class ChannelWebhookPolicy extends Effect.Service<ChannelWebhookPolicy>()(
	"ChannelWebhookPolicy/Policy",
	{
		effect: Effect.gen(function* () {
			const policyEntity = "ChannelWebhook" as const

			const channelRepo = yield* ChannelRepo
			const webhookRepo = yield* ChannelWebhookRepo
			const orgMemberRepo = yield* OrganizationMemberRepo

			// Helper: check if user is org admin
			const isOrgAdmin = (organizationId: OrganizationId, actorId: UserId) =>
				Effect.gen(function* () {
					const member = yield* orgMemberRepo
						.findByOrgAndUser(organizationId, actorId)
						.pipe(withSystemActor)

					if (Option.isNone(member)) {
						return false
					}

					return isAdminOrOwner(member.value.role)
				})

			// Can create webhook on a channel (org admin only)
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
								return yield* isOrgAdmin(channel.organizationId, actor.id)
							}),
						),
					),
				)

			// Can read webhooks for a channel (org admin only)
			const canRead = (channelId: ChannelId) =>
				UnauthorizedError.refail(
					policyEntity,
					"select",
				)(
					channelRepo.with(channelId, (channel) =>
						policy(
							policyEntity,
							"select",
							Effect.fn(`${policyEntity}.select`)(function* (actor) {
								return yield* isOrgAdmin(channel.organizationId, actor.id)
							}),
						),
					),
				)

			// Can update a webhook (org admin only)
			const canUpdate = (webhookId: ChannelWebhookId) =>
				UnauthorizedError.refail(
					policyEntity,
					"update",
				)(
					webhookRepo.with(webhookId, (webhook) =>
						policy(
							policyEntity,
							"update",
							Effect.fn(`${policyEntity}.update`)(function* (actor) {
								return yield* isOrgAdmin(webhook.organizationId, actor.id)
							}),
						),
					),
				)

			// Can delete a webhook (org admin only)
			const canDelete = (webhookId: ChannelWebhookId) =>
				UnauthorizedError.refail(
					policyEntity,
					"delete",
				)(
					webhookRepo.with(webhookId, (webhook) =>
						policy(
							policyEntity,
							"delete",
							Effect.fn(`${policyEntity}.delete`)(function* (actor) {
								return yield* isOrgAdmin(webhook.organizationId, actor.id)
							}),
						),
					),
				)

			return { canCreate, canRead, canUpdate, canDelete } as const
		}),
		dependencies: [ChannelRepo.Default, ChannelWebhookRepo.Default, OrganizationMemberRepo.Default],
		accessors: true,
	},
) {}
