import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import {
	CurrentUser,
	InternalServerError,
	policyRequire,
	policyUse,
	withRemapDbErrors,
} from "@hazel/effect-lib"
import { Effect, pipe } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { ChannelMemberPolicy } from "../policies/channel-member-policy"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"

export const HttpChannelMemberLive = HttpApiBuilder.group(HazelApi, "channelMembers", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser.Context

					const { createdChannelMember, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const createdChannelMember = yield* ChannelMemberRepo.insert({
									...payload,
									notificationCount: 0,
									userId: user.id,
									joinedAt: new Date(),
									deletedAt: null,
								}).pipe(Effect.map((res) => res[0]!))

								const txid = yield* generateTransactionId(tx)

								return { createdChannelMember, txid }
							}),
						)
						.pipe(
							policyUse(ChannelMemberPolicy.canCreate(payload.channelId)),
							withRemapDbErrors("ChannelMember", "create"),
						)

					return {
						data: createdChannelMember,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedChannelMember, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const updatedChannelMember = yield* ChannelMemberRepo.update({
									id: path.id,
									...payload,
								})

								const txid = yield* generateTransactionId(tx)

								return { updatedChannelMember, txid }
							}),
						)
						.pipe(
							policyUse(ChannelMemberPolicy.canUpdate(path.id)),
							withRemapDbErrors("ChannelMemberRepo", "update"),
						)

					return {
						data: updatedChannelMember,
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
								yield* ChannelMemberRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							policyUse(ChannelMemberPolicy.canDelete(path.id)),
							withRemapDbErrors("ChannelMemberRepo", "delete"),
						)

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
