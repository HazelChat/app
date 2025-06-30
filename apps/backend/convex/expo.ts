import { PushNotifications } from "@convex-dev/expo-push-notifications"
import { Id } from "confect-plus/server"
import { Effect, Schema } from "effect"
import { v } from "convex/values"
import { api, components } from "./_generated/api"
import type { Id as IdType } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"
import { ConfectMutationCtx, ConfectQueryCtx } from "./confect"
import { accountMutation, accountQuery } from "./middleware/withAccountEffect"

type AccountId = IdType<"accounts">

const pushNotifications = new PushNotifications<AccountId>(components.pushNotifications)

export const recordPushNotificationToken = accountMutation({
	args: Schema.Struct({
		token: Schema.String,
	}),
	returns: Schema.Null,
	handler: Effect.fn(function* ({ token, account }) {
		const ctx = yield* ConfectMutationCtx
		
		yield* Effect.promise(() => pushNotifications.recordToken(ctx as any, {
			userId: account._id,
			pushToken: token,
		}))
		
		return null
	}),
})

export const getStatusForUser = accountQuery({
	args: Schema.Struct({}),
	returns: Schema.Struct({
		registeredTokens: Schema.Array(Schema.Struct({
			pushToken: Schema.String,
			deviceData: Schema.optional(Schema.Struct({
				isDevice: Schema.Boolean,
				platform: Schema.Union(Schema.Literal("ios"), Schema.Literal("android"), Schema.Literal("web")),
				brand: Schema.optional(Schema.String),
				manufacturer: Schema.optional(Schema.String),
				modelName: Schema.optional(Schema.String)
			}))
		}))
	}),
	handler: Effect.fn(function* ({ account }) {
		const ctx = yield* ConfectQueryCtx
		
		const res = yield* Effect.promise(() => pushNotifications.getStatusForUser(ctx as any, {
			userId: account._id,
		}))

		return res
	}),
})

export const sendPushNotification = internalMutation({
	args: { title: v.string(), body: v.optional(v.string()), to: v.id("accounts") },
	handler: async (ctx, args) => {
		const pushId = await pushNotifications.sendPushNotification(ctx, {
			userId: args.to,
			allowUnregisteredTokens: true,
			notification: {
				title: args.title,
				body: args.body,
			},
		})
	},
})
