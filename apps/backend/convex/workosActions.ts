"use node"

import { WorkOS } from "@workos-inc/node"
import { v } from "convex/values"
import { internalAction } from "./_generated/server"

const workos = new WorkOS(process.env.WORKOS_API_KEY!)

export const verifyWorkosWebhook = internalAction({
	args: v.object({
		payload: v.string(),
		signature: v.string(),
	}),
	handler: async (_ctx, { payload, signature }) => {
		try {
			const event = await workos.webhooks.constructEvent({
				sigHeader: signature,
				payload,
				secret: process.env.WORKOS_WEBHOOK_SECRET!,
			})
			return { valid: true, event }
		} catch (err: any) {
			return { valid: false, error: err.message }
		}
	},
})

// Fetch all users from WorkOS
export const fetchWorkosUsers = internalAction({
	args: v.object({}),
	handler: async (_ctx, _args) => {
		const users = []
		let after: string | null = null

		try {
			// Paginate through all users
			do {
				const response = await workos.userManagement.listUsers({
					after: after || undefined,
					limit: 100,
				})

				users.push(...response.data)
				after = response.listMetadata?.after || null
			} while (after)

			return { success: true, users }
		} catch (err: any) {
			console.error("Error fetching WorkOS users:", err)
			return { success: false, error: err.message, users: [] }
		}
	},
})

// Fetch all organizations from WorkOS
export const fetchWorkosOrganizations = internalAction({
	args: v.object({}),
	handler: async (_ctx, _args) => {
		const organizations = []
		let after: string | null = null

		try {
			// Paginate through all organizations
			do {
				const response = await workos.organizations.listOrganizations({
					after: after || undefined,
					limit: 100,
				})

				organizations.push(...response.data)
				after = response.listMetadata?.after || null
			} while (after)

			return { success: true, organizations }
		} catch (err: any) {
			console.error("Error fetching WorkOS organizations:", err)
			return { success: false, error: err.message, organizations: [] }
		}
	},
})

// Fetch all organization memberships from WorkOS
export const fetchWorkosOrganizationMemberships = internalAction({
	args: v.object({
		organizationId: v.string(),
	}),
	handler: async (_ctx, { organizationId }) => {
		const memberships = []
		let after: string | null = null

		try {
			// Paginate through all memberships
			do {
				const response = await workos.userManagement.listOrganizationMemberships({
					organizationId,
					after: after || undefined,
					limit: 100,
				})

				memberships.push(...response.data)
				after = response.listMetadata?.after || null
			} while (after)

			return { success: true, memberships }
		} catch (err: any) {
			console.error(`Error fetching WorkOS memberships for org ${organizationId}:`, err)
			return { success: false, error: err.message, memberships: [] }
		}
	},
})

export const updateUser = internalAction({
	args: v.object({
		workosUserId: v.string(),
		firstName: v.string(),
		lastName: v.string(),
	}),
	handler: async (_ctx, { workosUserId, firstName, lastName }) => {
		try {
			await workos.userManagement.updateUser({
				userId: workosUserId,
				firstName,
				lastName,
			})

			return { success: true }
		} catch (err: any) {
			console.error("Error updating WorkOS user:", err)
			throw new Error(`Failed to update user in WorkOS: ${err.message}`)
		}
	},
})

// Send invitation to join an organization
export const sendInvitation = internalAction({
	args: v.object({
		email: v.string(),
		organizationId: v.string(),
		role: v.optional(v.string()),
		inviterUserId: v.optional(v.string()),
	}),
	handler: async (_ctx, { email, organizationId, role, inviterUserId }) => {
		try {
			const invitation = await workos.userManagement.sendInvitation({
				email,
				organizationId,
				...(role && { roleSlug: role }),
				...(inviterUserId && { inviterUserId }),
			})

			return { success: true, invitation }
		} catch (err: any) {
			console.error("Error sending WorkOS invitation:", err)
			return { success: false, error: err.message }
		}
	},
})

// Create a new organization in WorkOS
export const createWorkosOrganization = internalAction({
	args: v.object({
		name: v.string(),
		slug: v.string(),
		creatorUserId: v.string(),
	}),
	handler: async (_ctx, { name, slug, creatorUserId }) => {
		try {
			// Create the organization in WorkOS
			const organization = await workos.organizations.createOrganization({
				name,
				domains: [],
			})

			// Add the creator as an owner member
			await workos.userManagement.createOrganizationMembership({
				userId: creatorUserId,
				organizationId: organization.id,
				roleSlug: "owner",
			})

			return { success: true, organization }
		} catch (err: any) {
			console.error("Error creating WorkOS organization:", err)
			return { success: false, error: err.message }
		}
	},
})
