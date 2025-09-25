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

					// TODO: Verify the user has permission to create channels in this organization
					// This would typically check organization membership and role permissions
					// For now, we'll just create the channel

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
					// TODO: Verify the user has permission to update this channel
					// This would typically check organization membership and channel permissions
					// For now, we'll just update the channel

					const { updatedChannel, txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								const updatedChannel = yield* ChannelRepo.update({
									id: path.id,
									...payload,
								})

								const txid = yield* generateTransactionId(tx)

								return { updatedChannel, txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Updating Channel",
										cause: err,
									}),
								ParseError: (err) =>
									new InternalServerError({
										message: "Error Parsing Response Schema",
										cause: err,
									}),
							}),
						)

					return {
						data: updatedChannel,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					// TODO: Verify the user has permission to delete this channel
					// This would typically check organization membership and admin permissions
					// For now, we'll just delete the channel

					const { txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								yield* ChannelRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Deleting Channel",
										cause: err,
									}),
							}),
						)

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
