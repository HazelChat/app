import { Effect, Schema } from "effect"
import { ConfectQueryCtx } from "./confect"
import { userQuery } from "./middleware/withUserEffect"
import { confectSchema } from "./schema"

export const getFriends = userQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(confectSchema.tableSchemas.users.withSystemFields),
	handler: Effect.fn(function* ({ serverId, userData }) {
		const ctx = yield* ConfectQueryCtx

		const friends = yield* ctx.db
			.query("users")
			.withIndex("by_server_id", (q) => q.eq("serverId", serverId))
			.collect()

		return friends.filter((f) => f._id !== userData.user._id)
	}),
})

export const getMembers = userQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(confectSchema.tableSchemas.users.withSystemFields),
	handler: Effect.fn(function* ({ serverId }) {
		const ctx = yield* ConfectQueryCtx

		const friends = yield* ctx.db
			.query("users")
			.withIndex("by_server_id", (q) => q.eq("serverId", serverId))
			.collect()

		return friends
	}),
})
