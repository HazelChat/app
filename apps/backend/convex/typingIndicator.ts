import { v } from "convex/values"
import { asyncMap } from "convex-helpers"
import { internalMutation } from "./_generated/server"
import { userMutation, userQuery } from "./middleware/withUser"

// The duration in milliseconds to consider a user as "still typing".
// After this timeout, they will be considered to have stopped typing.
const TYPING_TIMEOUT = 5000 // 5 seconds

/**
 * Updates the "last typed" timestamp for a user in a room.
 * This is an "upsert" operation.
 * - If the user is not already marked as typing, a new document is created.
 * - If the user is already typing, their timestamp is updated.
 *
 * This mutation should be called from the client whenever the user types.
 */
export const update = userMutation({
	args: {
		channelId: v.id("channels"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, { channelId }) => {
		const membership = ctx.user.membership
		if (!membership) throw new Error("User not a member of this organization")

		console.log(`[DEBUG] Updating typing indicator for member ${membership._id} in channel ${channelId}`)

		const existing = await ctx.db
			.query("typingIndicators")
			.withIndex("by_memberId", (q) => q.eq("channelId", channelId).eq("memberId", membership._id))
			.unique()

		const now = Date.now()
		if (existing) {
			console.log(`[DEBUG] Updating existing typing indicator ${existing._id}`)
			await ctx.db.patch(existing._id, { lastTyped: now })
		} else {
			console.log(`[DEBUG] Creating new typing indicator for member ${membership._id}`)
			const id = await ctx.db.insert("typingIndicators", {
				channelId,
				memberId: membership._id,
				lastTyped: now,
			})
			console.log(`[DEBUG] Created typing indicator with id ${id}`)
		}
	},
})

/**
 * Returns a list of users who are actively typing in a room.
 * This query filters out users whose `lastTyped` timestamp is older
 * than the `TYPING_TIMEOUT`.
 */
export const list = userQuery({
	args: {
		channelId: v.id("channels"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, { channelId }) => {
		const threshold = Date.now() - TYPING_TIMEOUT
		const membership = ctx.user.membership

		console.log(`[DEBUG] Listing typing indicators for channel ${channelId}, current time: ${Date.now()}, threshold: ${threshold}, time window: ${TYPING_TIMEOUT}ms`)

		const typingIndicators = await ctx.db
			.query("typingIndicators")
			.withIndex("by_channel_timestamp", (q) => q.eq("channelId", channelId).gt("lastTyped", threshold))
			.collect()

		console.log(`[DEBUG] Found ${typingIndicators.length} typing indicators in DB`)

		const typingIndicatorsWithUsers = await asyncMap(typingIndicators, async (indicator) => {
			console.log(`[DEBUG] Processing indicator for member ${indicator.memberId}, lastTyped: ${new Date(indicator.lastTyped).toISOString()}`)
			
			if (membership && indicator.memberId === membership._id) {
				console.log(`[DEBUG] Filtering out current user ${membership._id}`)
				return null
			}

			// Get member details
			const orgMember = await ctx.db.get(indicator.memberId)
			if (!orgMember) {
				console.log(`[DEBUG] Member ${indicator.memberId} not found`)
				return null
			}

			// Get user details
			const user = await ctx.db.get(orgMember.userId)
			if (!user) {
				console.log(`[DEBUG] User ${orgMember.userId} not found`)
				return null
			}

			console.log(`[DEBUG] Including user ${user.firstName} ${user.lastName} in typing list`)
			return {
				...indicator,
				user,
			}
		})

		const result = typingIndicatorsWithUsers.filter((indicator) => indicator !== null)
		console.log(`[DEBUG] Returning ${result.length} typing users`)
		
		return result
	},
})

export const stop = userMutation({
	args: {
		channelId: v.id("channels"),
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, { channelId }) => {
		const membership = ctx.user.membership
		if (!membership) throw new Error("User not a member of this organization")

		const existing = await ctx.db
			.query("typingIndicators")
			.withIndex("by_memberId", (q) => q.eq("channelId", channelId).eq("memberId", membership._id))
			.unique()

		if (existing) {
			await ctx.db.delete(existing._id)
		}
	},
})

const STALE_TIMEOUT = 60 * 60 * 1000

/**
 * Internal mutation to clean up old, stale typing indicators from the database.
 * This is run by a cron job and is not intended to be called by the client.
 */
export const cleanupOld = internalMutation({
	handler: async (ctx) => {
		const threshold = Date.now() - STALE_TIMEOUT

		const staleIndicators = await ctx.db
			.query("typingIndicators")
			.withIndex("by_timestamp", (q) => q.lt("lastTyped", threshold))
			.take(100)

		await Promise.all(staleIndicators.map((doc) => ctx.db.delete(doc._id)))

		console.log(`Cleaned up ${staleIndicators.length} stale typing indicators.`)
	},
})
