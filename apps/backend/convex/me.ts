import { v } from "convex/values"
import { internal } from "./_generated/api"
import { accountMutation, accountQuery } from "./middleware/withAccount"
import { organizationServerQuery } from "./middleware/withOrganization"

export const get = accountQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.account.doc
	},
})

export const getCurrentUser = organizationServerQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.account.doc
	},
})

export const getOrganization = accountQuery({
	args: {},
	handler: async (ctx) => {
		const workosOrganizationId = ctx.identity.organizationId as string | undefined

		if (!workosOrganizationId) {
			throw new Error("You must be part of an organization to get your organization")
		}

		// Find the organization by WorkOS ID
		const organization = await ctx.db
			.query("organizations")
			.withIndex("by_workosId", (q) => q.eq("workosId", workosOrganizationId))
			.first()

		if (!organization) {
			return {
				directive: "redirect",
				to: "/auth/login",
			} as const
		}

		// Check if user is a member of this organization
		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", organization._id).eq("userId", ctx.account.doc._id),
			)
			.first()

		if (!membership) {
			return {
				directive: "redirect",
				to: "/auth/login",
			} as const
		}

		return {
			directive: "success",
			data: organization,
		} as const
	},
})

export const getUser = accountQuery({
	args: {
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		// Check if current user is a member of the organization
		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", ctx.account.id),
			)
			.first()

		return membership ? ctx.account.doc : null
	},
})

export const getLatestNotifcation = accountQuery({
	args: {},
	handler: async (ctx, _args) => {
		// Get all organization memberships for the user
		const memberships = await ctx.db
			.query("organizationMembers")
			.withIndex("by_userId", (q) => q.eq("userId", ctx.account.id))
			.collect()

		if (memberships.length === 0) return null

		// Get notifications for any of the user's memberships
		const notifications = await Promise.all(
			memberships.map((membership) =>
				ctx.db
					.query("notifications")
					.withIndex("by_memberId_targetedResourceId", (q) => q.eq("memberId", membership._id))
					.order("desc")
					.first(),
			),
		)

		// Return the most recent notification
		return (
			notifications
				.filter((n) => n !== null)
				.sort((a, b) => (b?._creationTime || 0) - (a?._creationTime || 0))[0] || null
		)
	},
})

export const updateProfile = accountMutation({
	args: {
		firstName: v.string(),
		lastName: v.string(),
	},
	handler: async (ctx, { firstName, lastName }) => {
		// First update in WorkOS
		await ctx.scheduler.runAfter(0, internal.workosActions.updateUser, {
			workosUserId: ctx.account.doc.externalId,
			firstName,
			lastName,
		})

		// Then update in Convex
		await ctx.db.patch(ctx.account.id, {
			firstName,
			lastName,
		})

		return { success: true }
	},
})
