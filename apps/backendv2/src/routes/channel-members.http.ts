import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { CurrentUser } from "../lib/auth"
import { generateTransactionId } from "../lib/create-transactionId"
import { InternalServerError } from "../lib/errors"
import { ChannelMemberRepo } from "../repositories/channel-member-repo"

export const HttpChannelMemberLive = HttpApiBuilder.group(HazelApi, "channelMembers", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const user = yield* CurrentUser

					// TODO: Verify the user has permission to add members to this channel
					// This would typically check organization membership and channel permissions
					// For now, we'll just add the member

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
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Creating Channel Member",
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
						data: createdChannelMember,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const _user = yield* CurrentUser

					// TODO: Verify the user has permission to update this channel member
					// This would typically check if it's their own membership or admin permissions
					// For now, we'll just update the channel member

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
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Updating Channel Member",
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
						data: updatedChannelMember,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const _user = yield* CurrentUser

					// TODO: Verify the user has permission to remove this channel member
					// This would typically check if it's their own membership or admin permissions
					// For now, we'll just remove the channel member

					const { txid } = yield* db
						.transaction(
							Effect.fnUntraced(function* (tx) {
								yield* ChannelMemberRepo.deleteById(path.id)

								const txid = yield* generateTransactionId(tx)

								return { txid }
							}),
						)
						.pipe(
							Effect.catchTags({
								DatabaseError: (err) =>
									new InternalServerError({
										message: "Error Deleting Channel Member",
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
