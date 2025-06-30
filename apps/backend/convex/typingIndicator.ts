import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { internalMutation } from "./_generated/server"
import { ConfectMutationCtx, ConfectQueryCtx } from "./confect"
import { accountMutation, accountQuery } from "./middleware/withAccountEffect"
import { confectSchema } from "./schema"

// The duration in milliseconds to consider a user as "still typing".
// After this timeout, they will be considered to have stopped typing.
const TYPING_TIMEOUT = 5000 // 5 seconds

/**
 * Updates the "last typed" timestamp for a user in a room.
 * This is an "upsert" operation.
 * - If the user is not already marked as typing, a new document is created.
 * - If the user is already typing, their timestamp is updated.
 *
 * This mutation should be called from the client whenever the user types.
 */
export const update = accountMutation({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ channelId, account }) {
		const ctx = yield* ConfectMutationCtx

		const existingOption = yield* ctx.db
			.query("typingIndicators")
			.withIndex("by_accountId", (q) => q.eq("channelId", channelId).eq("accountId", account._id))
			.unique()

		if (Option.isSome(existingOption)) {
			yield* ctx.db.patch(existingOption.value._id, { lastTyped: Date.now() })
		} else {
			yield* ctx.db.insert("typingIndicators", {
				channelId,
				accountId: account._id,
				lastTyped: Date.now(),
			})
		}

		return null
	}),
})

/**
 * Returns a list of users who are actively typing in a room.
 * This query filters out users whose `lastTyped` timestamp is older
 * than the `TYPING_TIMEOUT`.
 */
export const list = accountQuery({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Array(
		Schema.extend(
			confectSchema.tableSchemas.typingIndicators.withSystemFields,
			Schema.Struct({
				account: confectSchema.tableSchemas.accounts.withSystemFields,
			}),
		),
	),
	handler: Effect.fn(function* ({ channelId, account }) {
		const ctx = yield* ConfectQueryCtx

		const threshold = Date.now() - TYPING_TIMEOUT

		const typingIndicators = yield* ctx.db
			.query("typingIndicators")
			.withIndex("by_channel_timestamp", (q) => q.eq("channelId", channelId).gt("lastTyped", threshold))
			.collect()

		const typingIndicatorsWithUsers = yield* Effect.forEach(
			typingIndicators,
			Effect.fn(function* (indicator) {
				if (indicator.accountId === account._id) return null

				const accountOption = yield* ctx.db.get(indicator.accountId)

				if (Option.isNone(accountOption)) return null

				return {
					...indicator,
					account: accountOption.value,
				}
			}),
		)

		return typingIndicatorsWithUsers.filter((indicator) => indicator !== null)
	}),
})

export const stop = accountMutation({
	args: Schema.Struct({
		channelId: Id.Id("channels"),
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ channelId, account }) {
		const ctx = yield* ConfectMutationCtx

		const existingOption = yield* ctx.db
			.query("typingIndicators")
			.withIndex("by_accountId", (q) => q.eq("channelId", channelId).eq("accountId", account._id))
			.unique()

		if (Option.isSome(existingOption)) {
			yield* ctx.db.delete(existingOption.value._id)
		}

		return null
	}),
})

const STALE_TIMEOUT = 60 * 60 * 1000

/**
 * Internal mutation to clean up old, stale typing indicators from the database.
 * This is run by a cron job and is not intended to be called by the client.
 */
export const cleanupOld = internalMutation({
	handler: async (ctx) => {
		const threshold = Date.now() - STALE_TIMEOUT

		const staleIndicators = await ctx.db
			.query("typingIndicators")
			.withIndex("by_timestamp", (q) => q.lt("lastTyped", threshold))
			.take(100)

		await Promise.all(staleIndicators.map((doc) => ctx.db.delete(doc._id)))

		console.log(`Cleaned up ${staleIndicators.length} stale typing indicators.`)
	},
})
