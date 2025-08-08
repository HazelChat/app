import type { Event } from "@workos-inc/node"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { internalAction, internalMutation } from "./_generated/server"

export const processWorkosEvents = internalMutation({
	args: v.object({
		event: v.any(),
	}),
	handler: async (ctx, { event }) => {
		const typedEvent = event as Event
		try {
			switch (typedEvent.event) {
				case "user.created": {
					await ctx.db.insert("users", {
						externalId: typedEvent.data.id,
						avatarUrl:
							typedEvent.data.profilePictureUrl ||
							`https://avatar.vercel.sh/${typedEvent.data.id}.svg`,
						firstName: typedEvent.data.firstName || "",
						lastName: typedEvent.data.lastName || "",
						lastSeen: Date.now(),
						email: typedEvent.data.email,
						status: "offline",
					})
					break
				}
				case "user.updated": {
					const account = await ctx.db
						.query("users")
						.withIndex("by_externalId", (q) => q.eq("externalId", typedEvent.data.id))
						.first()

					if (account) {
						await ctx.db.patch(account._id, {
							avatarUrl:
								typedEvent.data.profilePictureUrl ||
								`https://avatar.vercel.sh/${typedEvent.data.id}.svg`,
							firstName: typedEvent.data.firstName || "",
							lastName: typedEvent.data.lastName || "",
						})
					}

					break
				}
				case "user.deleted": {
					const account = await ctx.db
						.query("users")
						.withIndex("by_externalId", (q) => q.eq("externalId", typedEvent.data.id))
						.first()

					if (account) {
						await ctx.db.delete(account._id)
					}

					break
				}
				case "organization.created": {
					await ctx.db.insert("organizations", {
						workosId: typedEvent.data.id,
						name: typedEvent.data.name,
						slug: typedEvent.data.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
					})
					break
				}
				case "organization.updated": {
					const organization = await ctx.db
						.query("organizations")
						.withIndex("by_workosId", (q) => q.eq("workosId", typedEvent.data.id))
						.first()

					if (organization) {
						await ctx.db.patch(organization._id, {
							name: typedEvent.data.name,
							slug: typedEvent.data.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
						})
					}

					break
				}
				case "organization.deleted": {
					const organization = await ctx.db
						.query("organizations")
						.withIndex("by_workosId", (q) => q.eq("workosId", event.data.id))
						.first()

					if (organization) {
						await ctx.db.delete(organization._id)
					}

					break
				}
				case "organization_membership.added": {
					const account = await ctx.db
						.query("users")
						.withIndex("by_externalId", (q) => q.eq("externalId", typedEvent.data.userId))
						.first()

					if (!account) {
						throw new Error(`Account ${typedEvent.data.userId} not found`)
					}

					const organization = await ctx.db
						.query("organizations")
						.withIndex("by_workosId", (q) => q.eq("workosId", typedEvent.data.organizationId))
						.first()

					if (!organization) {
						throw new Error(`Organization ${typedEvent.data.organizationId} not found`)
					}

					await ctx.db.insert("organizationMembers", {
						organizationId: organization._id,
						userId: account._id,
						role: typedEvent.data.role.slug,
						joinedAt: Date.now(),
					})

					// Check if there's a pending invitation for this user and mark it as accepted
					const pendingInvitation = await ctx.db
						.query("invitations")
						.withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
						.filter((q) =>
							q.and(q.eq(q.field("email"), account.email), q.eq(q.field("status"), "pending")),
						)
						.first()

					if (pendingInvitation) {
						await ctx.db.patch(pendingInvitation._id, {
							status: "accepted",
							acceptedAt: Date.now(),
							acceptedBy: account._id,
						})
					}

					break
				}
				case "organization_membership.updated": {
					const organization = await ctx.db
						.query("organizations")
						.withIndex("by_workosId", (q) => q.eq("workosId", typedEvent.data.organizationId))
						.first()

					if (!organization) {
						throw new Error(`Organization ${typedEvent.data.organizationId} not found`)
					}

					const user = await ctx.db
						.query("users")
						.withIndex("by_externalId", (q) => q.eq("externalId", typedEvent.data.userId))
						.first()

					if (!user) {
						throw new Error(`User ${typedEvent.data.userId} not found`)
					}

					const membership = await ctx.db
						.query("organizationMembers")
						.withIndex("by_organizationId_userId", (q) =>
							q.eq("organizationId", organization._id).eq("userId", user._id),
						)
						.first()

					if (!membership) {
						throw new Error(`Membership for ${typedEvent.data.userId} not found`)
					}

					await ctx.db.patch(membership._id, {
						role: typedEvent.data.role.slug,
					})
					break
				}
				case "organization_membership.removed": {
					const organization = await ctx.db
						.query("organizations")
						.withIndex("by_workosId", (q) => q.eq("workosId", typedEvent.data.organizationId))
						.first()

					if (!organization) {
						throw new Error(`Organization ${typedEvent.data.organizationId} not found`)
					}

					const user = await ctx.db
						.query("users")
						.withIndex("by_externalId", (q) => q.eq("externalId", typedEvent.data.userId))
						.first()

					if (!user) {
						throw new Error(`User ${typedEvent.data.userId} not found`)
					}

					const membership = await ctx.db
						.query("organizationMembers")
						.withIndex("by_organizationId_userId", (q) =>
							q.eq("organizationId", organization._id).eq("userId", user._id),
						)
						.first()

					if (membership) {
						await ctx.db.delete(membership._id)
					}

					break
				}
				default: {
					// Handle invitation.created event which isn't in the WorkOS TypeScript types yet
					if (typedEvent.event === "invitation.created") {
						const eventData = typedEvent.data

						const organizationId = eventData.organizationId

						if (!organizationId) {
							throw new Error("Organization ID not found in invitation.created event")
						}

						const organization = await ctx.db
							.query("organizations")
							.withIndex("by_workosId", (q) => q.eq("workosId", organizationId))
							.first()

						if (!organization) {
							throw new Error(`Organization ${eventData.organizationId} not found`)
						}

						let invitedBy: Id<"users"> | undefined
						if (eventData.inviterUserId) {
							const inviter = await ctx.db
								.query("users")
								.withIndex("by_externalId", (q) =>
									q.eq("externalId", eventData.inviterUserId as string),
								)
								.first()
							if (inviter) {
								invitedBy = inviter._id
							}
						}

						await ctx.db.insert("invitations", {
							workosInvitationId: eventData.id,
							organizationId: organization._id,
							email: eventData.email,
							invitedBy,
							invitedAt: new Date(eventData.createdAt).getTime(),
							expiresAt: new Date(eventData.expiresAt).getTime(),
							status: "pending",
						})
					}
					break
				}
			}
			return { success: true } as const
		} catch (err: any) {
			return { success: false, error: err.message } as const
		}
	},
})

// Sync users from WorkOS to Convex
export const syncUsers = internalMutation({
	args: v.object({
		users: v.array(v.any()),
	}),
	handler: async (ctx, { users }) => {
		const results = {
			created: 0,
			updated: 0,
			deleted: 0,
			errors: [] as string[],
		}

		try {
			// Get all existing users in Convex
			const existingUsers = await ctx.db.query("users").collect()
			const existingUserMap = new Map(existingUsers.map((u) => [u.externalId, u]))
			const workosUserIds = new Set(users.map((u) => u.id))

			// Create or update users from WorkOS
			for (const workosUser of users) {
				try {
					const existingUser = existingUserMap.get(workosUser.id)

					if (existingUser) {
						// Update existing user
						await ctx.db.patch(existingUser._id, {
							firstName: workosUser.firstName || "",
							lastName: workosUser.lastName || "",
							avatarUrl:
								workosUser.profilePictureUrl ||
								`https://avatar.vercel.sh/${workosUser.id}.svg`,
						})
						results.updated++
					} else {
						// Create new user
						await ctx.db.insert("users", {
							externalId: workosUser.id,
							firstName: workosUser.firstName || "",
							lastName: workosUser.lastName || "",
							avatarUrl:
								workosUser.profilePictureUrl ||
								`https://avatar.vercel.sh/${workosUser.id}.svg`,
							lastSeen: Date.now(),
							status: "offline",
							email: workosUser.email,
						})
						results.created++
					}
				} catch (err: any) {
					results.errors.push(`Error syncing user ${workosUser.id}: ${err.message}`)
				}
			}

			// Soft delete users that no longer exist in WorkOS
			for (const existingUser of existingUsers) {
				if (!workosUserIds.has(existingUser.externalId) && !existingUser.deletedAt) {
					try {
						await ctx.db.patch(existingUser._id, {
							deletedAt: Date.now(),
						})
						results.deleted++
					} catch (err: any) {
						results.errors.push(`Error deleting user ${existingUser.externalId}: ${err.message}`)
					}
				}
			}
		} catch (err: any) {
			results.errors.push(`Fatal error in syncUsers: ${err.message}`)
		}

		return results
	},
})

// Sync organizations from WorkOS to Convex
export const syncOrganizations = internalMutation({
	args: v.object({
		organizations: v.array(v.any()),
	}),
	handler: async (ctx, { organizations }) => {
		const results = {
			created: 0,
			updated: 0,
			deleted: 0,
			errors: [] as string[],
		}

		try {
			// Get all existing organizations in Convex
			const existingOrgs = await ctx.db.query("organizations").collect()
			const existingOrgMap = new Map(existingOrgs.map((o) => [o.workosId, o]))
			const workosOrgIds = new Set(organizations.map((o) => o.id))

			// Create or update organizations from WorkOS
			for (const workosOrg of organizations) {
				try {
					const existingOrg = existingOrgMap.get(workosOrg.id)

					if (existingOrg) {
						// Update existing organization
						await ctx.db.patch(existingOrg._id, {
							name: workosOrg.name,
							slug: workosOrg.slug || workosOrg.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
						})
						results.updated++
					} else {
						// Create new organization
						await ctx.db.insert("organizations", {
							workosId: workosOrg.id,
							name: workosOrg.name,
							slug: workosOrg.slug || workosOrg.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
						})
						results.created++
					}
				} catch (err: any) {
					results.errors.push(`Error syncing org ${workosOrg.id}: ${err.message}`)
				}
			}

			// Soft delete organizations that no longer exist in WorkOS
			for (const existingOrg of existingOrgs) {
				if (!workosOrgIds.has(existingOrg.workosId) && !existingOrg.deletedAt) {
					try {
						await ctx.db.patch(existingOrg._id, {
							deletedAt: Date.now(),
						})
						results.deleted++
					} catch (err: any) {
						results.errors.push(`Error deleting org ${existingOrg.workosId}: ${err.message}`)
					}
				}
			}
		} catch (err: any) {
			results.errors.push(`Fatal error in syncOrganizations: ${err.message}`)
		}

		return results
	},
})

// Sync organization memberships from WorkOS to Convex
export const syncOrganizationMemberships = internalMutation({
	args: v.object({
		organizationId: v.id("organizations"),
		workosOrgId: v.string(),
		memberships: v.array(v.any()),
	}),
	handler: async (ctx, { organizationId, memberships }) => {
		const results = {
			created: 0,
			updated: 0,
			deleted: 0,
			errors: [] as string[],
		}

		try {
			// Get all existing memberships for this organization
			const existingMemberships = await ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
				.collect()

			// Map users by externalId for quick lookup
			const users = await ctx.db.query("users").collect()
			const userMap = new Map(users.map((u) => [u.externalId, u]))

			// Create a map of existing memberships by userId
			const existingMembershipMap = new Map(existingMemberships.map((m) => [m.userId, m]))

			// Track which memberships we've seen from WorkOS
			const seenUserIds = new Set<any>()

			// Create or update memberships from WorkOS
			for (const workosMembership of memberships) {
				try {
					const user = userMap.get(workosMembership.userId)
					if (!user) {
						results.errors.push(`User ${workosMembership.userId} not found for membership`)
						continue
					}

					seenUserIds.add(user._id)
					const existingMembership = existingMembershipMap.get(user._id)
					const role = workosMembership.role?.slug || "member"

					if (existingMembership) {
						// Update existing membership if role changed
						if (existingMembership.role !== role) {
							await ctx.db.patch(existingMembership._id, { role })
							results.updated++
						}
					} else {
						// Create new membership
						await ctx.db.insert("organizationMembers", {
							organizationId,
							userId: user._id,
							role,
							joinedAt: Date.now(),
						})
						results.created++
					}
				} catch (err: any) {
					results.errors.push(
						`Error syncing membership for user ${workosMembership.userId}: ${err.message}`,
					)
				}
			}

			// Remove memberships that no longer exist in WorkOS
			for (const existingMembership of existingMemberships) {
				if (!seenUserIds.has(existingMembership.userId) && !existingMembership.deletedAt) {
					try {
						await ctx.db.patch(existingMembership._id, {
							deletedAt: Date.now(),
						})
						results.deleted++
					} catch (err: any) {
						results.errors.push(`Error removing membership: ${err.message}`)
					}
				}
			}
		} catch (err: any) {
			results.errors.push(`Fatal error in syncOrganizationMemberships: ${err.message}`)
		}

		return results
	},
})

// Sync invitations from WorkOS to Convex
export const syncInvitations = internalMutation({
	args: v.object({
		organizationId: v.id("organizations"),
		workosOrgId: v.string(),
		invitations: v.array(v.any()),
	}),
	handler: async (ctx, { organizationId, invitations }) => {
		const results = {
			created: 0,
			updated: 0,
			expired: 0,
			errors: [] as string[],
		}

		try {
			// Get all existing invitations for this organization
			const existingInvitations = await ctx.db
				.query("invitations")
				.withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
				.collect()

			// Create a map of existing invitations by WorkOS ID
			const existingInvitationMap = new Map(
				existingInvitations.map((inv) => [inv.workosInvitationId, inv]),
			)

			// Track which invitations we've seen from WorkOS
			const seenInvitationIds = new Set<string>()

			// Create or update invitations from WorkOS
			for (const workosInvitation of invitations) {
				try {
					seenInvitationIds.add(workosInvitation.id)
					const existingInvitation = existingInvitationMap.get(workosInvitation.id)

					// Determine status based on WorkOS data
					let status: "pending" | "accepted" | "expired" | "revoked" = "pending"
					if (workosInvitation.state === "accepted") {
						status = "accepted"
					} else if (workosInvitation.state === "expired") {
						status = "expired"
					} else if (workosInvitation.state === "revoked") {
						status = "revoked"
					}

					// Find inviter user if available
					let invitedBy: any
					if (workosInvitation.inviterUserId) {
						const inviter = await ctx.db
							.query("users")
							.withIndex("by_externalId", (q) =>
								q.eq("externalId", workosInvitation.inviterUserId),
							)
							.first()
						if (inviter) {
							invitedBy = inviter._id
						}
					}

					if (existingInvitation) {
						// Update existing invitation if status changed
						if (existingInvitation.status !== status) {
							const updateData: any = { status }

							// Add acceptedAt if just accepted
							if (status === "accepted" && !existingInvitation.acceptedAt) {
								updateData.acceptedAt = Date.now()

								// Try to find accepted by user
								if (workosInvitation.acceptedByUserId) {
									const acceptedByUser = await ctx.db
										.query("users")
										.withIndex("by_externalId", (q) =>
											q.eq("externalId", workosInvitation.acceptedByUserId),
										)
										.first()
									if (acceptedByUser) {
										updateData.acceptedBy = acceptedByUser._id
									}
								}
							}

							await ctx.db.patch(existingInvitation._id, updateData)
							results.updated++
						}
					} else {
						await ctx.db.insert("invitations", {
							workosInvitationId: workosInvitation.id,
							organizationId,
							email: workosInvitation.email,
							invitedBy,
							invitedAt: new Date(workosInvitation.createdAt).getTime(),
							expiresAt: new Date(workosInvitation.expiresAt).getTime(),
							status,
							...(status === "accepted" && workosInvitation.acceptedAt
								? { acceptedAt: new Date(workosInvitation.acceptedAt).getTime() }
								: {}),
						})
						results.created++
					}
				} catch (err: any) {
					results.errors.push(`Error syncing invitation ${workosInvitation.id}: ${err.message}`)
				}
			}

			// Mark invitations as expired if they are past expiration date
			for (const existingInvitation of existingInvitations) {
				if (existingInvitation.status === "pending" && Date.now() > existingInvitation.expiresAt) {
					try {
						await ctx.db.patch(existingInvitation._id, {
							status: "expired",
						})
						results.expired++
					} catch (err: any) {
						results.errors.push(`Error expiring invitation: ${err.message}`)
					}
				}
			}
		} catch (err: any) {
			results.errors.push(`Fatal error in syncInvitations: ${err.message}`)
		}

		return results
	},
})

// Main sync orchestrator that coordinates the full sync process
export const syncWorkosData = internalAction({
	args: v.object({}),
	handler: async (ctx, _args) => {
		const results = {
			users: { created: 0, updated: 0, deleted: 0, errors: [] as string[] },
			organizations: { created: 0, updated: 0, deleted: 0, errors: [] as string[] },
			memberships: { created: 0, updated: 0, deleted: 0, errors: [] as string[] },
			invitations: { created: 0, updated: 0, expired: 0, errors: [] as string[] },
			totalErrors: 0,
			startTime: Date.now(),
			endTime: 0,
		}

		try {
			console.log("Starting WorkOS sync...")

			// Step 1: Sync all users
			console.log("Fetching users from WorkOS...")
			const usersResult = await ctx.runAction(internal.workosActions.fetchWorkosUsers, {})
			if (usersResult.success) {
				console.log(`Found ${usersResult.users.length} users in WorkOS`)
				const syncUsersResult = await ctx.runMutation(internal.workos.syncUsers, {
					users: usersResult.users,
				})
				results.users = syncUsersResult
				console.log(
					`Users sync complete: created=${syncUsersResult.created}, updated=${syncUsersResult.updated}, deleted=${syncUsersResult.deleted}`,
				)
			} else {
				results.users.errors.push(usersResult.error || "Unknown error fetching users")
			}

			console.log("Fetching organizations from WorkOS...")
			const orgsResult = await ctx.runAction(internal.workosActions.fetchWorkosOrganizations, {})
			if (orgsResult.success) {
				console.log(`Found ${orgsResult.organizations.length} organizations in WorkOS`)
				const syncOrgsResult = await ctx.runMutation(internal.workos.syncOrganizations, {
					organizations: orgsResult.organizations,
				})
				results.organizations = syncOrgsResult
				console.log(
					`Organizations sync complete: created=${syncOrgsResult.created}, updated=${syncOrgsResult.updated}, deleted=${syncOrgsResult.deleted}`,
				)
			} else {
				results.organizations.errors.push(orgsResult.error || "Unknown error fetching organizations")
			}

			// Step 3: Sync memberships for each organization
			if (orgsResult.success && orgsResult.organizations.length > 0) {
				console.log("Syncing memberships for each organization...")

				// Get all organizations from Convex to map WorkOS IDs to Convex IDs
				const convexOrgs = await ctx.runQuery(internal.organizations.getAllOrganizations, {})
				const workosIdToConvexId = new Map(convexOrgs.map((org) => [org.workosId, org._id]))

				for (const workosOrg of orgsResult.organizations) {
					const convexOrgId = workosIdToConvexId.get(workosOrg.id)
					if (!convexOrgId) {
						results.memberships.errors.push(`Organization ${workosOrg.id} not found in Convex`)
						continue
					}

					try {
						const membershipsResult = await ctx.runAction(
							internal.workosActions.fetchWorkosOrganizationMemberships,
							{ organizationId: workosOrg.id },
						)

						if (membershipsResult.success) {
							const syncMembershipsResult = await ctx.runMutation(
								internal.workos.syncOrganizationMemberships,
								{
									organizationId: convexOrgId,
									workosOrgId: workosOrg.id,
									memberships: membershipsResult.memberships,
								},
							)
							results.memberships.created += syncMembershipsResult.created
							results.memberships.updated += syncMembershipsResult.updated
							results.memberships.deleted += syncMembershipsResult.deleted
							results.memberships.errors.push(...syncMembershipsResult.errors)
						} else {
							results.memberships.errors.push(
								`Failed to fetch memberships for org ${workosOrg.id}: ${membershipsResult.error}`,
							)
						}
					} catch (err: any) {
						results.memberships.errors.push(
							`Error syncing memberships for org ${workosOrg.id}: ${err.message}`,
						)
					}
				}
				console.log(
					`Memberships sync complete: created=${results.memberships.created}, updated=${results.memberships.updated}, deleted=${results.memberships.deleted}`,
				)
			}

			// Step 4: Sync invitations for each organization
			if (orgsResult.success && orgsResult.organizations.length > 0) {
				console.log("Syncing invitations for each organization...")

				// Get all organizations from Convex to map WorkOS IDs to Convex IDs
				const convexOrgs = await ctx.runQuery(internal.organizations.getAllOrganizations, {})
				const workosIdToConvexId = new Map(convexOrgs.map((org) => [org.workosId, org._id]))

				for (const workosOrg of orgsResult.organizations) {
					const convexOrgId = workosIdToConvexId.get(workosOrg.id)
					if (!convexOrgId) {
						results.invitations.errors.push(`Organization ${workosOrg.id} not found in Convex`)
						continue
					}

					try {
						const invitationsResult = await ctx.runAction(
							internal.workosActions.fetchWorkosInvitations,
							{ organizationId: workosOrg.id },
						)

						if (invitationsResult.success) {
							const syncInvitationsResult = await ctx.runMutation(
								internal.workos.syncInvitations,
								{
									organizationId: convexOrgId,
									workosOrgId: workosOrg.id,
									invitations: invitationsResult.invitations,
								},
							)
							results.invitations.created += syncInvitationsResult.created
							results.invitations.updated += syncInvitationsResult.updated
							results.invitations.expired += syncInvitationsResult.expired
							results.invitations.errors.push(...syncInvitationsResult.errors)
						} else {
							results.invitations.errors.push(
								`Failed to fetch invitations for org ${workosOrg.id}: ${invitationsResult.error}`,
							)
						}
					} catch (err: any) {
						results.invitations.errors.push(
							`Error syncing invitations for org ${workosOrg.id}: ${err.message}`,
						)
					}
				}
				console.log(
					`Invitations sync complete: created=${results.invitations.created}, updated=${results.invitations.updated}, expired=${results.invitations.expired}`,
				)
			}

			// Calculate total errors
			results.totalErrors =
				results.users.errors.length +
				results.organizations.errors.length +
				results.memberships.errors.length +
				results.invitations.errors.length

			results.endTime = Date.now()
			const duration = (results.endTime - results.startTime) / 1000

			console.log(`WorkOS sync completed in ${duration}s with ${results.totalErrors} errors`)

			if (results.totalErrors > 0) {
				console.error("Sync errors:", {
					users: results.users.errors,
					organizations: results.organizations.errors,
					memberships: results.memberships.errors,
					invitations: results.invitations.errors,
				})
			}

			return results
		} catch (err: any) {
			console.error("Fatal error in syncWorkosData:", err)
			results.endTime = Date.now()

			throw err
			// return {
			// 	...results,
			// 	totalErrors: results.totalErrors + 1,
			// 	users: {
			// 		...results.users,
			// 		errors: [...results.users.errors, `Fatal error: ${err.message}`],
			// 	},
			// }
		}
	},
})
