import { internalMutation } from "@hazel/backend/server"
import { asyncMap } from "convex-helpers"
import { v } from "convex/values"
import { internal } from "../_generated/api"

export const sendNotification = internalMutation({
	args: {
		userId: v.id("users"),
		messageId: v.id("messages"),
		accountId: v.id("accounts"),
		channelId: v.id("channels"),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId)
		if (!message) return

		const author = await ctx.db.get(message.authorId)
		if (!author) return
		const channel = await ctx.db.get(args.channelId)
		if (!channel) return

		const channelMembers = await ctx.db
			.query("channelMembers")
			.withIndex("by_channelIdAndUserId", (q) => q.eq("channelId", args.channelId))
			.collect()

		const filteredChannelMembers = channelMembers.filter(
			(member) => !member.isMuted && member.userId !== args.userId,
		)

		await asyncMap(filteredChannelMembers, async (member) => {
			const user = await ctx.db.get(member.userId)
			if (!user) return
			const account = await ctx.db.get(user.accountId)

			if (!account) return

			await ctx.db.insert("notifications", {
				accountId: account._id,
				targetedResourceId: args.channelId,
				resourceId: args.messageId,
			})
		})

		await asyncMap(filteredChannelMembers, async (member) => {
			const user = await ctx.db.get(member.userId)
			if (!user) return
			const account = await ctx.db.get(user.accountId)

			if (!account) return

			await ctx.scheduler.runAfter(0, internal.expo.sendPushNotification, {
				title: `${author.displayName} sent you a message in ${channel.name}`,
				to: account._id,
				body: message.content,
			})
		})
	},
})
