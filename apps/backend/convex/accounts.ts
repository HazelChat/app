import { Id } from "confect-plus/server"
import { v } from "convex/values"
import { Effect, Option, Schema } from "effect"
import { mutation } from "./_generated/server"
import { ConfectQueryCtx } from "./confect"
import { accountQuery } from "./middleware/withAccountEffect"
import { confectSchema } from "./schema"

export const getAccount = accountQuery({
	args: Schema.Struct({
		id: Id.Id("accounts"),
	}),
	returns: Schema.Union(confectSchema.tableSchemas.accounts.withSystemFields, Schema.Null),
	handler: Effect.fn(function* ({ id }) {
		const ctx = yield* ConfectQueryCtx

		// TODO: Add validation logic for viewing account permissions
		// For now, just return the account if it exists
		const accountOption = yield* ctx.db.get(id)

		if (Option.isNone(accountOption)) {
			return null
		}

		return accountOption.value
	}),
})

export const createAccount = mutation({
	args: {
		displayName: v.optional(v.string()),
		tag: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity()
		if (!identity) {
			throw new Error("Called storeUser without authentication present")
		}

		const displayName = args.displayName || identity.name || "Unknown"

		const account = await ctx.db
			.query("accounts")
			.withIndex("bg_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
			.unique()

		if (account !== null) {
			if (account.displayName !== displayName) {
				await ctx.db.patch(account._id, { displayName })
			}
			return account._id
		}

		return await ctx.db.insert("accounts", {
			externalId: identity.subject,
			avatarUrl: identity.pictureUrl || `https://avatar.vercel.sh/${identity.subject}.svg`,
			displayName,
			// tag: args.tag?.toLowerCase() || identity.nickname?.toLowerCase() || identity.subject.toLowerCase(),
			// lastSeen: Date.now(),
			tokenIdentifier: identity.tokenIdentifier,
			// status: "offline",
		})
	},
})
