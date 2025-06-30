import { paginationOptsValidator } from "convex/server"
import { Id } from "confect-plus/server"
import { Effect, Option, Schema } from "effect"
import { query } from "./_generated/server"
import { ConfectQueryCtx, ConfectMutationCtx } from "./confect"
import { accountMutation, accountQuery } from "./middleware/withAccountEffect"
import { confectSchema } from "./schema"

export const getServer = accountQuery({
	args: Schema.Struct({
		serverId: Id.Id("servers"),
	}),
	returns: Schema.Union(confectSchema.tableSchemas.servers.withSystemFields, Schema.Null),
	handler: Effect.fn(function* ({ serverId }) {
		const ctx = yield* ConfectQueryCtx

		const serverOption = yield* ctx.db
			.query("servers")
			.withIndex("by_id", (q) => q.eq("_id", serverId))
			.first()

		if (Option.isNone(serverOption)) {
			return null
		}

		return serverOption.value
	}),
})

export const getServers = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		return await ctx.db.query("servers").paginate(args.paginationOpts)
	},
})

export const getServerForUser = accountQuery({
	args: Schema.Struct({
		serverId: Id.Id("servers"),
	}),
	returns: Schema.Union(confectSchema.tableSchemas.servers.withSystemFields, Schema.Null),
	handler: Effect.fn(function* ({ serverId, account }) {
		const ctx = yield* ConfectQueryCtx

		const serverMemberOption = yield* ctx.db
			.query("users")
			.withIndex("by_accountId_serverId", (q) =>
				q.eq("accountId", account._id).eq("serverId", serverId),
			)
			.first()

		if (Option.isNone(serverMemberOption)) {
			return null
		}

		const serverMember = serverMemberOption.value
		const serverOption = yield* ctx.db.get(serverMember.serverId)

		if (Option.isNone(serverOption)) {
			return null
		}

		return serverOption.value
	}),
})

export const getServersForUser = accountQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(confectSchema.tableSchemas.servers.withSystemFields),
	handler: Effect.fn(function* ({ account }) {
		const ctx = yield* ConfectQueryCtx

		const serverMembers = yield* ctx.db
			.query("users")
			.withIndex("by_accountId_serverId", (q) => q.eq("accountId", account._id))
			.collect()

		const servers = yield* Effect.forEach(
			serverMembers,
			Effect.fn(function* (member) {
				const serverOption = yield* ctx.db.get(member.serverId)
				if (Option.isNone(serverOption)) {
					return yield* Effect.fail(new Error("Server not found"))
				}
				return serverOption.value
			}),
		)

		return servers
	}),
})

export const createServer = accountMutation({
	args: Schema.Struct({
		name: Schema.String,
		imageUrl: Schema.optional(Schema.String),
	}),
	returns: Id.Id("servers"),
	handler: Effect.fn(function* ({ name, imageUrl, account }) {
		const ctx = yield* ConfectMutationCtx

		const serverId = yield* ctx.db.insert("servers", {
			name,
			imageUrl,
			updatedAt: Date.now(),
		})

		// Create user for this account in the new server
		const userId = yield* ctx.db.insert("users", {
			accountId: account._id,
			serverId,
			displayName: account.displayName,
			tag: account.displayName,
			avatarUrl: account.avatarUrl,
			role: "owner",
			status: "online",
			joinedAt: Date.now(),
			lastSeen: Date.now(),
		})

		yield* ctx.db.patch(serverId, {
			creatorId: userId,
		})

		yield* ctx.db.insert("channels", {
			serverId: serverId,
			name: "general",
			type: "public",
			updatedAt: Date.now(),
			pinnedMessages: [],
		})

		return serverId
	}),
})
