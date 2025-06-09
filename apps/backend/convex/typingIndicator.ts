/**
 * Functions related to reading & writing presence data.
 *
 * Note: this file does not currently implement authorization.
 * That is left as an exercise to the reader. Some suggestions for a production
 * app:
 * - Use Convex `auth` to authenticate users rather than passing up a "user"
 * - Check that the user is allowed to be in a given room.
 */
import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Doc } from "./_generated/dataModel"
import { internalMutation, mutation, query } from "./_generated/server"
import { userMutation } from "./middleware/withUser"

const LIST_LIMIT = 20
const MARK_AS_GONE_MS = 8_000

/**
 * Overwrites the presence data for a given user in a room.
 *
 * It will also set the "updated" timestamp to now, and create the presence
 * document if it doesn't exist yet.
 *
 * @param room - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @param user - The user associated with the presence data.
 */
export const update = userMutation({
	args: { room: v.string(), user: v.string(), data: v.any() },
	handler: async (ctx, { room, user, data }) => {
		const existing = await ctx.db
			.query("old_presence")
			.withIndex("room_user", (q) => q.eq("room", room).eq("user", user))
			.unique()

		if (existing) {
			const patch: Partial<Doc<"old_presence">> = {
				data: {
					...data,
					user: ctx.user.doc,
				},
			}
			if (existing.present === false) {
				patch.present = true
				patch.latestJoin = Date.now()
			}
			await ctx.db.patch(existing._id, patch)
		} else {
			await ctx.db.insert("old_presence", {
				user,
				data: {
					...data,
					user: ctx.user.doc,
				},
				room,
				present: true,
				latestJoin: Date.now(),
			})
		}
	},
})

/**
 * Updates the "updated" timestamp for a given user's presence in a room.
 *
 * @param room - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @param user - The user associated with the presence data.
 */
export const heartbeat = mutation({
	args: { room: v.string(), user: v.string() },
	handler: async (ctx, { room, user }) => {
		const existing = await ctx.db
			.query("old_presence_heartbeats")
			.withIndex("by_room_user", (q) => q.eq("room", room).eq("user", user))
			.unique()

		const markAsGone = await ctx.scheduler.runAfter(
			MARK_AS_GONE_MS,
			internal.typingIndicator.markAsGone,
			{
				room,
				user,
			},
		)

		if (existing) {
			const watchdog = await ctx.db.system.get(existing.markAsGone)
			if (watchdog && watchdog.state.kind === "pending") {
				await ctx.scheduler.cancel(watchdog._id)
			}
			await ctx.db.patch(existing._id, {
				markAsGone,
			})
		} else {
			await ctx.db.insert("old_presence_heartbeats", {
				user,
				room,
				markAsGone,
			})
		}
	},
})

export const markAsGone = internalMutation({
	args: { room: v.string(), user: v.string() },
	handler: async (ctx, args) => {
		const presence = await ctx.db
			.query("old_presence")
			.withIndex("room_user", (q) => q.eq("room", args.room).eq("user", args.user))
			.unique()
		if (!presence || presence.present === false) {
			return
		}
		await ctx.db.patch(presence._id, { present: false })
	},
})

/**
 * Lists the presence data for N users in a room, ordered by recent update.
 *
 * @param room - The location associated with the presence data. Examples:
 * page, chat channel, game instance.
 * @returns A list of presence objects, ordered by recent update, limited to
 * the most recent N.
 */
export const list = query({
	args: { room: v.string() },
	handler: async (ctx, { room }) => {
		const presence = await ctx.db
			.query("old_presence")
			.withIndex("room_present_join", (q) => q.eq("room", room))
			.take(LIST_LIMIT)

		return presence.map(({ _creationTime, latestJoin, user, data, present }) => ({
			created: _creationTime,
			latestJoin,
			user,
			data,
			present,
		}))
	},
})
