import { PgClient } from "@effect/sql-pg"
import type { ChannelId, OrganizationId, UserId } from "@hazel/domain"
import { Context, Effect, Layer } from "effect"

export interface ShareChannelParams {
	channelId: ChannelId
	organizationId: OrganizationId
	sharedBy: UserId
}

export interface RevokeShareParams {
	channelId: ChannelId
	organizationId: OrganizationId
	revokedBy: UserId
}

export interface RecordParticipantParams {
	channelId: ChannelId
	userId: UserId
	organizationId: OrganizationId
}

export class SharedChannelRepo extends Context.Tag("SharedChannelRepo")<
	SharedChannelRepo,
	{
		/**
		 * Share a channel with another organization.
		 * Creates a channel_organization_shares record.
		 */
		readonly shareChannel: (params: ShareChannelParams) => Effect.Effect<void, never, PgClient.PgClient>

		/**
		 * Revoke an organization's access to a shared channel.
		 * Marks the share as revoked (soft delete).
		 */
		readonly revokeShare: (params: RevokeShareParams) => Effect.Effect<void, never, PgClient.PgClient>

		/**
		 * Get all organizations that have access to a channel (excluding the owner org).
		 * Returns only active shares (not revoked).
		 */
		readonly getSharedOrganizations: (
			channelId: ChannelId,
		) => Effect.Effect<OrganizationId[], never, PgClient.PgClient>

		/**
		 * Check if a specific organization has access to a channel.
		 * Returns true if there's an active share.
		 */
		readonly isSharedWithOrg: (
			channelId: ChannelId,
			organizationId: OrganizationId,
		) => Effect.Effect<boolean, never, PgClient.PgClient>

		/**
		 * Get all channels shared with a specific organization.
		 * Returns channel IDs where the org is a guest (not the owner).
		 */
		readonly getSharedChannels: (
			organizationId: OrganizationId,
		) => Effect.Effect<ChannelId[], never, PgClient.PgClient>

		/**
		 * Record that a user from a guest organization has participated in a shared channel.
		 * Creates or updates the shared_channel_participants record.
		 */
		readonly recordParticipant: (
			params: RecordParticipantParams,
		) => Effect.Effect<void, never, PgClient.PgClient>

		/**
		 * Get active participants for a shared channel.
		 * Returns users who have joined/posted from guest organizations.
		 */
		readonly getActiveParticipants: (
			channelId: ChannelId,
		) => Effect.Effect<
			Array<{ userId: UserId; organizationId: OrganizationId }>,
			never,
			PgClient.PgClient
		>
	}
>() {}

export const SharedChannelRepoLive = Layer.effect(
	SharedChannelRepo,
	Effect.gen(function* () {
		const sql = yield* PgClient.PgClient

		return SharedChannelRepo.of({
			shareChannel: (params) =>
				Effect.gen(function* () {
					yield* sql`
						INSERT INTO channel_organization_shares
						(channel_id, organization_id, shared_by)
						VALUES (${params.channelId}, ${params.organizationId}, ${params.sharedBy})
						ON CONFLICT (channel_id, organization_id)
						DO UPDATE SET
							revoked_at = NULL,
							revoked_by = NULL,
							shared_at = NOW(),
							shared_by = ${params.sharedBy}
					`.pipe(Effect.orDie)
				}),

			revokeShare: (params) =>
				Effect.gen(function* () {
					yield* sql`
						UPDATE channel_organization_shares
						SET
							revoked_at = NOW(),
							revoked_by = ${params.revokedBy}
						WHERE
							channel_id = ${params.channelId}
							AND organization_id = ${params.organizationId}
							AND revoked_at IS NULL
					`.pipe(Effect.orDie)
				}),

			getSharedOrganizations: (channelId) =>
				sql<{ organizationId: OrganizationId }>`
					SELECT organization_id as "organizationId"
					FROM channel_organization_shares
					WHERE
						channel_id = ${channelId}
						AND revoked_at IS NULL
				`.pipe(
					Effect.orDie,
					Effect.map((rows) => rows.map((row) => row.organizationId)),
				),

			isSharedWithOrg: (channelId, organizationId) =>
				sql<{ count: number }>`
					SELECT COUNT(*)::int as count
					FROM channel_organization_shares
					WHERE
						channel_id = ${channelId}
						AND organization_id = ${organizationId}
						AND revoked_at IS NULL
				`.pipe(
					Effect.orDie,
					Effect.map((rows) => (rows[0]?.count ?? 0) > 0),
				),

			getSharedChannels: (organizationId) =>
				sql<{ channelId: ChannelId }>`
					SELECT channel_id as "channelId"
					FROM channel_organization_shares
					WHERE
						organization_id = ${organizationId}
						AND revoked_at IS NULL
				`.pipe(
					Effect.orDie,
					Effect.map((rows) => rows.map((row) => row.channelId)),
				),

			recordParticipant: (params) =>
				Effect.gen(function* () {
					yield* sql`
						INSERT INTO shared_channel_participants
						(channel_id, user_id, organization_id)
						VALUES (${params.channelId}, ${params.userId}, ${params.organizationId})
						ON CONFLICT (channel_id, user_id, organization_id)
						DO UPDATE SET last_active_at = NOW()
					`.pipe(Effect.orDie)
				}),

			getActiveParticipants: (channelId) =>
				sql<{
					userId: UserId
					organizationId: OrganizationId
				}>`
					SELECT
						user_id as "userId",
						organization_id as "organizationId"
					FROM shared_channel_participants
					WHERE channel_id = ${channelId}
					ORDER BY last_active_at DESC
				`.pipe(
					Effect.orDie,
					Effect.map((rows) => [...rows]),
				),
		})
	}),
)
