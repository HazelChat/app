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
			"channelMember.create": (payload) =>
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

			"channelMember.update": ({ id, ...payload }) =>
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

			"channelMember.delete": ({ id }) =>
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
