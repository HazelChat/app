import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { ChannelMemberPolicy } from "../../policies/channel-member-policy"
import { ChannelMemberRepo } from "../../repositories/channel-member-repo"
import { ChannelMemberRpcs } from "../groups/channel-members"

/**
 * Channel Member RPC Handlers
 *
 * Implements the business logic for all channel member-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling
 */
export const ChannelMemberRpcLive = ChannelMemberRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database

		return {
			/**
			 * ChannelMemberCreate Handler
			 *
			 * Adds the current user to a channel. The userId is automatically set
			 * from the authenticated user. Requires permission to join the channel.
			 *
			 * Process:
			 * 1. Get current user from context (provided by AuthMiddleware)
			 * 2. Start database transaction
			 * 3. Create channel member with userId set to current user
			 * 4. Set default values for notificationCount, joinedAt, and deletedAt
			 * 5. Check permissions via ChannelMemberPolicy.canCreate
			 * 6. Generate transaction ID for optimistic updates
			 * 7. Return channel member data and transaction ID
			 */
			ChannelMemberCreate: (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const user = yield* CurrentUser.Context

							const createdChannelMember = yield* ChannelMemberRepo.insert({
								...payload,
								notificationCount: 0,
								userId: user.id,
								joinedAt: new Date(),
								deletedAt: null,
							}).pipe(Effect.map((res) => res[0]!))

							const txid = yield* generateTransactionId()

							return {
								data: createdChannelMember,
								transactionId: txid,
							}
						}),
					)
					.pipe(
						policyUse(ChannelMemberPolicy.canCreate(payload.channelId)),
						withRemapDbErrors("ChannelMember", "create"),
					),

			/**
			 * ChannelMemberUpdate Handler
			 *
			 * Updates channel member preferences and settings.
			 * Members can update their own preferences (mute, hide, favorite).
			 * Organization admins can update any member's settings.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Update channel member
			 * 3. Check permissions via ChannelMemberPolicy.canUpdate
			 * 4. Generate transaction ID
			 * 5. Return updated channel member data and transaction ID
			 */
			ChannelMemberUpdate: ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							const updatedChannelMember = yield* ChannelMemberRepo.update({
								id,
								...payload,
							})

							const txid = yield* generateTransactionId()

							return {
								data: updatedChannelMember,
								transactionId: txid,
							}
						}),
					)
					.pipe(
						policyUse(ChannelMemberPolicy.canUpdate(id)),
						withRemapDbErrors("ChannelMember", "update"),
					),

			/**
			 * ChannelMemberDelete Handler
			 *
			 * Removes a user from a channel (soft delete).
			 * Members can leave channels themselves.
			 * Organization admins can remove any member from a channel.
			 *
			 * Process:
			 * 1. Start database transaction
			 * 2. Delete channel member (sets deletedAt timestamp)
			 * 3. Check permissions via ChannelMemberPolicy.canDelete
			 * 4. Generate transaction ID
			 * 5. Return transaction ID
			 */
			ChannelMemberDelete: ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* ChannelMemberRepo.deleteById(id)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(
						policyUse(ChannelMemberPolicy.canDelete(id)),
						withRemapDbErrors("ChannelMember", "delete"),
					),
		}
	}),
)
