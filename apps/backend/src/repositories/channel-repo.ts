import { ModelRepository, schema } from "@hazel/db"
import type { ChannelId, UserId } from "@hazel/domain"
import { Channel } from "@hazel/domain/models"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"
import { OrganizationMemberRepo } from "./organization-member-repo"
import { SharedChannelRepo, SharedChannelRepoLive } from "./shared-channel-repo"

export class ChannelRepo extends Effect.Service<ChannelRepo>()("ChannelRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.channelsTable, Channel.Model, {
			idColumn: "id",
			name: "Channel",
		})
		const sharedChannelRepo = yield* SharedChannelRepo
		const organizationMemberRepo = yield* OrganizationMemberRepo

		/**
		 * Check if a user has access to a channel.
		 * Returns true if:
		 * 1. User is a member of the channel's owner organization, OR
		 * 2. User is a member of an organization that has been granted access via sharing
		 */
		const hasAccess = (channelId: ChannelId, userId: UserId) =>
			Effect.gen(function* () {
				// Get the channel
				const channel = yield* baseRepo.findById(channelId)
				if (Option.isNone(channel)) {
					return false
				}

				const channelData = channel.value

				// Check if user is in the owner organization
				const ownerMembership = yield* organizationMemberRepo.findByOrgAndUser(
					channelData.organizationId,
					userId,
				)
				if (Option.isSome(ownerMembership)) {
					return true
				}

				// Check if user is in any of the shared organizations
				const sharedOrgs = yield* sharedChannelRepo.getSharedOrganizations(channelId)

				for (const orgId of sharedOrgs) {
					const membership = yield* organizationMemberRepo.findByOrgAndUser(orgId, userId)
					if (Option.isSome(membership)) {
						return true
					}
				}

				return false
			})

		/**
		 * Get all organization IDs that have access to a channel.
		 * Includes the owner org and all shared orgs.
		 */
		const getChannelOrganizations = (channelId: ChannelId) =>
			Effect.gen(function* () {
				const channel = yield* baseRepo.findById(channelId)
				if (Option.isNone(channel)) {
					return []
				}

				const ownerOrgId = channel.value.organizationId
				const sharedOrgs = yield* sharedChannelRepo.getSharedOrganizations(channelId)

				return [ownerOrgId, ...sharedOrgs]
			})

		return {
			...baseRepo,
			hasAccess,
			getChannelOrganizations,
		}
	}),
	dependencies: [DatabaseLive, SharedChannelRepoLive],
}) {}
