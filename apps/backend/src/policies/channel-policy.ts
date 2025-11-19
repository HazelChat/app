import {
	type ChannelId,
	type OrganizationId,
	policy,
	policyCompose,
	UnauthorizedError,
	type UserId,
} from "@hazel/domain"
import { Effect, pipe } from "effect"
import { ChannelRepo } from "../repositories/channel-repo"
import { OrganizationPolicy } from "./organization-policy"

export class ChannelPolicy extends Effect.Service<ChannelPolicy>()("ChannelPolicy/Policy", {
	effect: Effect.gen(function* () {
		const policyEntity = "Channel" as const

		const organizationPolicy = yield* OrganizationPolicy

		const channelRepo = yield* ChannelRepo

		const canCreate = (organizationId: OrganizationId) =>
			UnauthorizedError.refail(
				policyEntity,
				"create",
			)(
				pipe(
					organizationPolicy.isMember(organizationId),
					policyCompose(policy(policyEntity, "create", (_actor) => Effect.succeed(true))),
				),
			)

		const canUpdate = (id: ChannelId) =>
			UnauthorizedError.refail(
				policyEntity,
				"update",
			)(
				channelRepo.with(id, (channel) =>
					pipe(
						organizationPolicy.canUpdate(channel.organizationId),
						policyCompose(policy(policyEntity, "update", (_actor) => Effect.succeed(true))),
					),
				),
			)

		const canDelete = (id: ChannelId) =>
			UnauthorizedError.refail(
				policyEntity,
				"delete",
			)(
				channelRepo.with(id, (channel) =>
					pipe(
						organizationPolicy.canUpdate(channel.organizationId),
						policyCompose(policy(policyEntity, "delete", (_actor) => Effect.succeed(true))),
					),
				),
			)

		/**
		 * Hazel Connect: Check if user can share a channel with other organizations.
		 * Only admins/owners of the initiator organization can share channels.
		 */
		const canShare = (id: ChannelId) =>
			UnauthorizedError.refail(
				policyEntity,
				"share",
			)(
				channelRepo.with(id, (channel) =>
					pipe(
						// Only admins/owners of the owner org can share
						organizationPolicy.canUpdate(channel.organizationId),
						policyCompose(policy(policyEntity, "share", (_actor) => Effect.succeed(true))),
					),
				),
			)

		/**
		 * Hazel Connect: Check if user can view/access a channel.
		 * Users from the owner org OR any shared org can view.
		 */
		const canView = (id: ChannelId, userId: UserId) =>
			UnauthorizedError.refail(
				policyEntity,
				"view",
			)(
				pipe(
					channelRepo.hasAccess(id, userId),
					Effect.flatMap((hasAccess) =>
						hasAccess
							? policy(policyEntity, "view", (_actor) => Effect.succeed(true))
							: Effect.fail(
									new UnauthorizedError({
										message: `You can't view this ${policyEntity}`,
										detail: `You are not authorized to view ${policyEntity} ${id}`,
									}),
								),
					),
				),
			)

		return { canUpdate, canDelete, canCreate, canShare, canView } as const
	}),
	dependencies: [ChannelRepo.Default, OrganizationPolicy.Default],
	accessors: true,
}) {}
