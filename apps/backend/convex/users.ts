import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { ConfectMutationCtx, ConfectQueryCtx } from "./confect"
import { accountMutation } from "./middleware/withAccountEffect"
import { userQuery } from "./middleware/withUserEffect"
import { confectSchema } from "./schema"

export const getUsers = userQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(confectSchema.tableSchemas.users.withSystemFields),
	handler: Effect.fn(function* ({ serverId }) {
		const ctx = yield* ConfectQueryCtx

		return yield* ctx.db
			.query("users")
			.withIndex("by_server_id", (q) => q.eq("serverId", serverId))
			.collect()
	}),
})

export const getUser = userQuery({
	args: Schema.Struct({
		userId: Id.Id("users"),
	}),
	returns: confectSchema.tableSchemas.users.withSystemFields,
	handler: Effect.fn(function* ({ userId, serverId }) {
		const ctx = yield* ConfectQueryCtx

		const userOption = yield* ctx.db.get(userId)

		if (Option.isNone(userOption)) {
			return yield* Effect.fail(new Error("User not found"))
		}

		const user = userOption.value

		if (user.serverId !== serverId) {
			return yield* Effect.fail(new Error("User not found"))
		}

		return user
	}),
})

export const createUser = accountMutation({
	args: Schema.Struct({
		serverId: Id.Id("servers"),
		role: Schema.Union(Schema.Literal("member"), Schema.Literal("admin"), Schema.Literal("owner")),
	}),
	returns: Id.Id("users"),
	handler: Effect.fn(function* ({ serverId, role, account }) {
		const ctx = yield* ConfectMutationCtx

		// TODO: Add validation here
		// Check if user already exists for this server
		const existingUserOption = yield* ctx.db
			.query("users")
			.withIndex("by_accountId_serverId", (q) => q.eq("accountId", account._id))
			.filter((q) => q.eq(q.field("serverId"), serverId))
			.unique()

		if (Option.isSome(existingUserOption)) {
			return yield* Effect.fail(new Error("User already exists"))
		}

		return yield* ctx.db.insert("users", {
			accountId: account._id,
			serverId,
			displayName: account.displayName,
			tag: account.displayName,
			avatarUrl: account.avatarUrl,
			role,
			status: "online",
			joinedAt: Date.now(),
			lastSeen: Date.now(),
		})
	}),
})
