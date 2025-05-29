import { query } from "./_generated/server"

export const get = query({
	args: {},
	handler: async (ctx) => {
		const user = await ctx.auth.getUserIdentity()

		if (!user) throw new Error("Not authenticated")

		const account = await ctx.db
			.query("accounts")
			.withIndex("by_externalId", (q) => q.eq("externalId", user.subject))
			.first()

		if (!account) null

		return account
	},
})
