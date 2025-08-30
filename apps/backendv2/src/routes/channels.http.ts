import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { CurrentUser } from "../lib/auth"
import { generateTransactionId } from "../lib/create-transactionId"
import { InternalServerError } from "../lib/errors"
import { ChannelRepo } from "../repositories/channel-repo"

export const HttpChannelLive = HttpApiBuilder.group(HazelApi, "channels", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers.handle(
			"create",
			Effect.fn(function* ({ payload }) {
				const user = yield* CurrentUser

				// TODO: Verify the user has permission to create channels in this organization
				// This would typically check organization membership and role permissions
				// For now, we'll just create the channel

				const { createdChannel, txid } = yield* db
					.transaction(
						Effect.fnUntraced(function* (tx) {
							const createdChannel = yield* ChannelRepo.insert({
								organizationId: user.organizationId,
								...payload,
								parentChannelId: payload.parentChannelId ?? null,
								deletedAt: null,
							}).pipe(Effect.map((res) => res[0]!))

							const txid = yield* generateTransactionId(tx)

							return { createdChannel, txid }
						}),
					)
					.pipe(
						Effect.catchTags({
							DatabaseError: (err) =>
								new InternalServerError({ message: "Error Creating Channel", cause: err }),
							ParseError: (err) =>
								new InternalServerError({
									message: "Error Parsing Response Schema",
									cause: err,
								}),
						}),
					)

				return {
					data: createdChannel,
					transactionId: txid,
				}
			}),
		)
	}),
)
