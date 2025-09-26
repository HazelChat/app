import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { ChannelMemberId } from "@hazel/db/schema"
import {
	CurrentUser,
	InternalServerError,
	policyUse,
	withRemapDbErrors,
	withSystemActor,
} from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { ChannelPolicy } from "../policies/channel-policy"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"
import { ChannelRepo } from "../repositories/channel-repo"

export const HttpChannelLive = HttpApiBuilder.group(HazelApi, "channels", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser.Context

					const { createdChannel, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdChannel = yield* ChannelRepo.insert({
									...payload,
									deletedAt: null,
								}).pipe(
									Effect.map((res) => res[0]!),
									policyUse(ChannelPolicy.canCreate(payload.organizationId)),
								)

								yield* ChannelMemberRepo.insert({
									channelId: createdChannel.id,
									userId: user.id,
									isHidden: false,
									isMuted: false,
									isFavorite: false,
									lastSeenMessageId: null,
									notificationCount: 0,
									joinedAt: new Date(),
									deletedAt: null,
								}).pipe(withSystemActor)

								const txid = yield* generateTransactionId(tx)

								return { createdChannel, txid }
							}),
						)
						.pipe(withRemapDbErrors("Channel", "create"))

					return {
						data: createdChannel,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedChannel, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const updatedChannel = yield* ChannelRepo.update({
									id: path.id,
									...payload,
								}).pipe(policyUse(ChannelPolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId(tx)

								return { updatedChannel, txid }
							}),
						)
						.pipe(withRemapDbErrors("Channel", "update"))

					return {
						data: updatedChannel,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const { txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								yield* ChannelRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							policyUse(ChannelPolicy.canDelete(path.id)),
							withRemapDbErrors("Channel", "delete"),
						)

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
