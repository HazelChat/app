import { v } from "convex/values"
import { internal } from "./_generated/api"
import { action, internalQuery, query } from "./_generated/server"
import { accountMutation, accountQuery } from "./middleware/withAccount"
import { organizationServerMutation } from "./middleware/withOrganization"

export const create = action({
	args: {
		name: v.string(),
		slug: v.string(),
		logoUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity()
		if (!identity) {
			throw new Error("Not authenticated")
		}

		const existingOrg = await ctx.runQuery(internal.organizations.checkSlugExists, {
			slug: args.slug,
		})

		if (existingOrg) {
			throw new Error("Organization slug already exists")
		}

		const workosResult: { success: boolean; organization?: any; error?: string } = await ctx.runAction(
			internal.workosActions.createWorkosOrganization,
			{
				name: args.name,
				slug: args.slug,
				creatorUserId: identity.subject,
			},
		)

		if (!workosResult.success || !workosResult.organization) {
			throw new Error(workosResult.error || "Failed to create organization in WorkOS")
		}

		return {
			workosId: workosResult.organization.id,
			name: workosResult.organization.name,
			slug: args.slug,
			logoUrl: args.logoUrl,
		}
	},
})

export const update = accountMutation({
	args: {
		organizationId: v.id("organizations"),
		name: v.optional(v.string()),
		logoUrl: v.optional(v.string()),
		settings: v.optional(
			v.object({
				allowInvites: v.optional(v.boolean()),
				defaultUserRole: v.optional(v.union(v.literal("member"), v.literal("admin"))),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Check if user has permission to update organization
		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", ctx.account.doc._id),
			)
			.first()

		if (!membership || membership.role !== "admin") {
			throw new Error("You don't have permission to update this organization")
		}

		const updates: any = {
			updatedAt: Date.now(),
		}

		if (args.name !== undefined) updates.name = args.name
		if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl
		if (args.settings !== undefined) updates.settings = args.settings

		await ctx.db.patch(args.organizationId, updates)

		return args.organizationId
	},
})

export const listMembers = accountQuery({
	args: {
		organizationId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		// Check if user is a member of the organization
		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", ctx.account.doc._id),
			)
			.first()

		if (!membership) {
			throw new Error("You are not a member of this organization")
		}

		// Get all members
		const members = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect()

		// Get user details for each member
		const memberDetails = await Promise.all(
			members.map(async (member) => {
				const user = await ctx.db.get(member.userId)
				return {
					...member,
					user,
				}
			}),
		)

		return memberDetails.filter((m) => m.user !== null)
	},
})

export const inviteMember = organizationServerMutation({
	args: {
		email: v.string(),
		role: v.union(v.literal("member"), v.literal("admin")),
	},
	handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
		if (ctx.organizationMembership.role !== "admin") {
			throw new Error("You don't have permission to invite members to this organization")
		}

		// Schedule invitation to be sent via WorkOS
		// organization is already available in context
		await ctx.scheduler.runAfter(0, internal.workosActions.sendInvitation, {
			email: args.email,
			organizationId: ctx.organization.workosId,
			role: args.role,
			inviterUserId: ctx.account.doc.externalId,
		})

		// Return success immediately - the invitation will be sent asynchronously
		return {
			success: true,
			message: `Invitation is being sent to ${args.email}`,
		}
	},
})

export const updateMemberRole = accountMutation({
	args: {
		organizationId: v.id("organizations"),
		userId: v.id("users"),
		newRole: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
	},
	handler: async (ctx, args) => {
		// Check if user has permission to update roles
		const currentUserMembership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", ctx.account.doc._id),
			)
			.first()

		if (
			!currentUserMembership ||
			(currentUserMembership.role !== "admin" && currentUserMembership.role !== "owner")
		) {
			throw new Error("Only organization admins and owners can update member roles")
		}

		// Find the member to update
		const memberToUpdate = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", args.userId),
			)
			.first()

		if (!memberToUpdate) {
			throw new Error("Member not found in organization")
		}

		// Only owners can promote/demote other owners or promote to owner
		if (
			(memberToUpdate.role === "owner" || args.newRole === "owner") &&
			currentUserMembership.role !== "owner"
		) {
			throw new Error("Only owners can manage owner roles")
		}

		// Don't allow demoting the last admin/owner
		if (
			(memberToUpdate.role === "admin" || memberToUpdate.role === "owner") &&
			args.newRole === "member"
		) {
			const adminAndOwnerCount = await ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "owner")))
				.collect()

			if (adminAndOwnerCount.length === 1) {
				throw new Error("Cannot demote the last admin/owner of an organization")
			}
		}

		// Update the role
		await ctx.db.patch(memberToUpdate._id, {
			role: args.newRole,
		})

		return memberToUpdate._id
	},
})

export const removeMember = accountMutation({
	args: {
		organizationId: v.id("organizations"),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		// Check if user has permission to remove members
		const currentUserMembership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", ctx.account.doc._id),
			)
			.first()

		if (
			!currentUserMembership ||
			(currentUserMembership.role !== "admin" && currentUserMembership.role !== "owner")
		) {
			throw new Error("Only organization admins and owners can remove members")
		}

		// Find the member to remove
		const memberToRemove = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId_userId", (q) =>
				q.eq("organizationId", args.organizationId).eq("userId", args.userId),
			)
			.first()

		if (!memberToRemove) {
			throw new Error("Member not found in organization")
		}

		// Only owners can remove other admins/owners
		if (
			(memberToRemove.role === "admin" || memberToRemove.role === "owner") &&
			currentUserMembership.role !== "owner"
		) {
			throw new Error("Only owners can remove admins and other owners")
		}

		// Don't allow removing the last admin/owner
		if (memberToRemove.role === "admin" || memberToRemove.role === "owner") {
			const adminAndOwnerCount = await ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.filter((q) => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "owner")))
				.collect()

			if (adminAndOwnerCount.length === 1) {
				throw new Error("Cannot remove the last admin/owner of an organization")
			}
		}

		// Soft delete the membership
		await ctx.db.patch(memberToRemove._id, {
			deletedAt: Date.now(),
		})

		return memberToRemove._id
	},
})

export const getBySlug = query({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first()
	},
})

export const getUserOrganizations = accountQuery({
	args: {},
	handler: async (ctx) => {
		// Get all organization memberships for the current user
		const memberships = await ctx.db
			.query("organizationMembers")
			.withIndex("by_userId", (q) => q.eq("userId", ctx.account.doc._id))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect()

		// Get organization details for each membership
		const organizations = await Promise.all(
			memberships.map(async (membership) => {
				const org = await ctx.db.get(membership.organizationId)
				return org
					? {
							...org,
							role: membership.role,
							joinedAt: membership.joinedAt,
						}
					: null
			}),
		)

		return organizations.filter((org) => org !== null)
	},
})

// Internal query to get all organizations (for sync purposes)
export const getAllOrganizations = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("organizations").collect()
	},
})

// Internal query to check if slug exists
export const checkSlugExists = internalQuery({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		const org = await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first()
		return !!org
	},
})
