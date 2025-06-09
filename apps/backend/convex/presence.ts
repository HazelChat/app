import { Presence } from "@convex-dev/presence"
import { v } from "convex/values"
import { components } from "./_generated/api"
import { mutation, query } from "./_generated/server"
import { accountMutation } from "./middleware/withAccount"

export const presence = new Presence(components.presence)

export const heartbeat = accountMutation({
	args: { roomId: v.string(), userId: v.id("users"), sessionId: v.string(), interval: v.number() },
	handler: async (ctx, { roomId, userId, sessionId, interval }) => {
		return await presence.heartbeat(ctx, roomId, userId, sessionId, interval)
	},
})

export const list = query({
	args: { roomToken: v.string() },
	handler: async (ctx, { roomToken }) => {
		return await presence.list(ctx, roomToken)
	},
})

export const disconnect = mutation({
	args: { sessionToken: v.string() },
	handler: async (ctx, { sessionToken }) => {
		return await presence.disconnect(ctx, sessionToken)
	},
})
