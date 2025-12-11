import { Database } from "@hazel/db"
import { CurrentUser, policyUse, withRemapDbErrors } from "@hazel/domain"
import { ChannelMemberRpcs } from "@hazel/domain/rpc"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { ChannelMemberPolicy } from "../../policies/channel-member-policy"
import { ChannelMemberRepo } from "../../repositories/channel-member-repo"

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
								channelId: payload.channelId,
								userId: user.id,
								isHidden: false,
								isMuted: false,
								isFavorite: false,
								lastSeenMessageId: null,
								notificationCount: 0,
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

			"channelMember.clearNotifications": ({ channelId }) =>
				Effect.gen(function* () {
					const user = yield* CurrentUser.Context

					// Find the channel member record for this user and channel
					const memberOption = yield* ChannelMemberRepo.findByChannelAndUser(
						channelId,
						user.id,
					).pipe(
						policyUse(ChannelMemberPolicy.canRead(channelId)),
						withRemapDbErrors("ChannelMember", "select"),
					)

					// Wrap the update and transaction ID generation in a single transaction
					const result = yield* db
						.transaction(
							Effect.gen(function* () {
								// If member exists, clear the notification count
								if (memberOption._tag === "Some") {
									yield* ChannelMemberRepo.update({
										id: memberOption.value.id,
										notificationCount: 0,
									}).pipe(policyUse(ChannelMemberPolicy.canUpdate(memberOption.value.id)))
								}

								const txid = yield* generateTransactionId()

								return { transactionId: txid }
							}),
						)
						.pipe(withRemapDbErrors("ChannelMember", "update"))

					return result
				}),
		}
	}),
)
