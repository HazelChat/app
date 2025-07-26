import { v } from "convex/values"
import { internal } from "./_generated/api"
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server"
import { accountMutation, accountQuery } from "./middleware/withAccount"
import { organizationServerMutation } from "./middleware/withOrganization"

export const create = accountMutation({
	args: {
		name: v.string(),
		slug: v.string(),
		logoUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if slug is already taken
		const existingOrg = await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first()

		if (existingOrg) {
			throw new Error("Organization slug already exists")
		}

		// For now, we'll create the organization with a temporary WorkOS ID
		// and schedule the WorkOS creation to happen asynchronously
		const tempWorkosId = `org_temp_${Math.random().toString(36).substring(2, 11)}`

		// Create organization in Convex first
		const organizationId = await ctx.db.insert("organizations", {
			workosId: tempWorkosId,
			name: args.name,
			slug: args.slug,
			logoUrl: args.logoUrl,
		})

		// Add creator as owner
		await ctx.db.insert("organizationMembers", {
			organizationId,
			userId: ctx.account.doc._id,
			role: "owner",
			joinedAt: Date.now(),
		})

		// Schedule WorkOS organization creation
		await ctx.scheduler.runAfter(0, internal.organizations.createInWorkOS, {
			organizationId,
			name: args.name,
			slug: args.slug,
			creatorUserId: ctx.account.doc.externalId,
		})

		return { organizationId, workosId: tempWorkosId }
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

		if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
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
		// Check if user has permission to invite members
		// organizationMembership is already available in context
		if (ctx.organizationMembership.role !== "owner" && ctx.organizationMembership.role !== "admin") {
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

		if (!currentUserMembership || currentUserMembership.role !== "owner") {
			throw new Error("Only organization owners can remove members")
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

		// Don't allow removing the last owner
		if (memberToRemove.role === "owner") {
			const ownerCount = await ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
				.filter((q) => q.eq(q.field("role"), "owner"))
				.collect()

			if (ownerCount.length === 1) {
				throw new Error("Cannot remove the last owner of an organization")
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

// Internal action to create organization in WorkOS after Convex creation
export const createInWorkOS = internalAction({
	args: {
		organizationId: v.id("organizations"),
		name: v.string(),
		slug: v.string(),
		creatorUserId: v.string(),
	},
	handler: async (ctx, args) => {
		// Call WorkOS to create the organization
		const workosResult = await ctx.runAction(internal.workosActions.createWorkosOrganization, {
			name: args.name,
			slug: args.slug,
			creatorUserId: args.creatorUserId,
		})

		if (workosResult.success && workosResult.organization) {
			// Update the organization with the real WorkOS ID
			await ctx.runMutation(internal.organizations.updateWorkosId, {
				organizationId: args.organizationId,
				workosId: workosResult.organization.id,
			})
		} else {
			// If WorkOS creation failed, we might want to mark the organization
			// or handle this error in some way
			console.error("Failed to create organization in WorkOS:", workosResult.error)
		}
	},
})

// Internal mutation to update WorkOS ID after successful creation
export const updateWorkosId = internalMutation({
	args: {
		organizationId: v.id("organizations"),
		workosId: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.organizationId, {
			workosId: args.workosId,
		})
	},
})
