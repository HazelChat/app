import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { ConfectQueryCtx } from "./confect"
import { accountQuery } from "./middleware/withAccountEffect"
import { confectSchema } from "./schema"

export const get = accountQuery({
	args: Schema.Struct({}),
	returns: confectSchema.tableSchemas.accounts.withoutSystemFields,
	handler: Effect.fn(function* ({ account }) {
		return account
	}),
})

export const getUser = accountQuery({
	args: Schema.Struct({
		serverId: Id.Id("servers"),
	}),
	returns: Schema.Union(confectSchema.tableSchemas.users.withSystemFields, Schema.Null),
	handler: Effect.fn(function* ({ serverId, account }) {
		const ctx = yield* ConfectQueryCtx

		const userOption = yield* ctx.db
			.query("users")
			.withIndex("by_accountId_serverId", (q) =>
				q.eq("accountId", account._id).eq("serverId", serverId),
			)
			.first()

		if (Option.isNone(userOption)) {
			return null
		}

		return userOption.value
	}),
})

export const getLatestNotifcation = accountQuery({
	args: Schema.Struct({}),
	returns: Schema.Union(confectSchema.tableSchemas.notifications.withSystemFields, Schema.Null),
	handler: Effect.fn(function* ({ account }) {
		const ctx = yield* ConfectQueryCtx

		const notificationOption = yield* ctx.db
			.query("notifications")
			.withIndex("by_accountId_targetedResourceId", (q) => q.eq("accountId", account._id))
			.order("desc")
			.first()

		if (Option.isNone(notificationOption)) {
			return null
		}

		return notificationOption.value
	}),
})
