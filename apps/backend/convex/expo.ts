import { PushNotifications } from "@convex-dev/expo-push-notifications"
import { v } from "convex/values"
import { components } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { accountMutation } from "./middleware/withAccount"

type AccountId = Id<"accounts">

const pushNotifications = new PushNotifications<AccountId>(components.pushNotifications)

export const recordPushNotificationToken = accountMutation({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		await pushNotifications.recordToken(ctx, {
			userId: ctx.account.id,
			pushToken: args.token,
		})
	},
})

// export const sendPushNotification = mutation({
// 	args: { title: v.string(), to: v.string() },
// 	handler: async (ctx, args) => {
// 		const pushId = await pushNotifications.sendPushNotification(ctx, {
// 			userId: ctx.,
// 			notification: {
// 				title: args.title,
// 			},
// 		})
// 	},
// })
