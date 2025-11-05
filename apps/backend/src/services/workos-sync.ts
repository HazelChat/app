import { type OrganizationId, type UserId, withSystemActor } from "@hazel/db/schema"
import type { Event } from "@workos-inc/node"
import { Effect, Option, pipe, Schema } from "effect"
import { InvitationRepo } from "../repositories/invitation-repo"
import { OrganizationMemberRepo } from "../repositories/organization-member-repo"
import { OrganizationRepo } from "../repositories/organization-repo"
import { UserRepo } from "../repositories/user-repo"
import { DatabaseLive } from "./database"
import { WorkOS } from "./workos"

// Error types
export class WorkOSSyncError extends Schema.TaggedError<WorkOSSyncError>("WorkOSSyncError")(
	"WorkOSSyncError",
	{
		message: Schema.String,
		cause: Schema.optional(Schema.Unknown),
	},
) {}

// Sync result types
export interface SyncResult {
	created: number
	updated: number
	deleted: number
	errors: string[]
}

export interface FullSyncResult {
	users: SyncResult
	organizations: SyncResult
	memberships: SyncResult
	invitations: SyncResult
	totalErrors: number
	startTime: number
	endTime: number
}

export class WorkOSSync extends Effect.Service<WorkOSSync>()("WorkOSSync", {
	accessors: true,
	effect: Effect.gen(function* () {
		const workos = yield* WorkOS
		const userRepo = yield* UserRepo
		const orgRepo = yield* OrganizationRepo
		const orgMemberRepo = yield* OrganizationMemberRepo
		const invitationRepo = yield* InvitationRepo

		// Helper to convert an Effect to an Either and accumulate results
		const collectResult = <A>(
			effect: Effect.Effect<A, unknown>,
			onSuccess: (a: A) => void,
			onError: (error: unknown) => void,
		) =>
			pipe(
				effect,
				Effect.either,
				// biome-ignore lint/suspicious/useIterableCallbackReturn: <explanation>
				Effect.map((either) => {
					if (either._tag === "Right") {
						onSuccess(either.right)
					} else {
						onError(either.left)
					}
				}),
			)

		// Sync all users from WorkOS
		const syncUsers = Effect.gen(function* () {
			const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: [] }

			// Fetch all users from WorkOS
			const workosUsersResult = yield* pipe(
				workos.call((client) => client.userManagement.listUsers({ limit: 100 })),
				Effect.either,
			)

			if (workosUsersResult._tag === "Left") {
				result.errors.push(`Failed to fetch users from WorkOS: ${workosUsersResult.left}`)
				return result
			}

			const workosUsers = workosUsersResult.right

			// Get all existing users
			const existingUsers = yield* userRepo.findAllActive()
			const existingUserMap = new Map(existingUsers.map((u) => [u.externalId, u]))
			const workosUserIds = new Set(workosUsers.data.map((u) => u.id))

			// Upsert users from WorkOS
			yield* Effect.all(
				workosUsers.data.map((workosUser) =>
					collectResult(
						userRepo
							.upsertByExternalId({
								externalId: workosUser.id,
								email: workosUser.email,
								firstName: workosUser.firstName || "",
								lastName: workosUser.lastName || "",
								avatarUrl:
									workosUser.profilePictureUrl ||
									`https://avatar.vercel.sh/${workosUser.id}.svg`,
								status: "offline" as const,
								lastSeen: new Date(),
								settings: null,
								deletedAt: null,
							})
							.pipe(withSystemActor),
						() => {
							if (existingUserMap.has(workosUser.id)) {
								result.updated++
							} else {
								result.created++
							}
						},
						(error) => {
							result.errors.push(`Error syncing user ${workosUser.id}: ${error}`)
						},
					),
				),
				{ concurrency: "unbounded" },
			)

			// Soft delete users that no longer exist in WorkOS
			yield* Effect.all(
				existingUsers
					.filter(
						(user) => !workosUserIds.has(user.externalId) && !user.externalId.startsWith("mock_"),
					)
					.map((user) =>
						collectResult(
							userRepo.softDeleteByExternalId(user.externalId).pipe(withSystemActor),
							() => result.deleted++,
							(error) => {
								result.errors.push(`Error deleting user ${user.externalId}: ${error}`)
							},
						),
					),
				{ concurrency: "unbounded" },
			)

			return result
		})

		// Sync all organizations from WorkOS
		const syncOrganizations = Effect.gen(function* () {
			const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: [] }

			// Fetch all organizations from WorkOS
			const workosOrgsResult = yield* pipe(
				workos.call((client) => client.organizations.listOrganizations({ limit: 100 })),
				Effect.either,
			)

			if (workosOrgsResult._tag === "Left") {
				result.errors.push(`Failed to fetch organizations from WorkOS: ${workosOrgsResult.left}`)
				return result
			}

			const workosOrgs = workosOrgsResult.right

			// Get all existing organizations
			const existingOrgs = yield* orgRepo.findAllActive()
			const existingOrgMap = new Map(existingOrgs.map((o) => [o.id, o]))
			const workosOrgExternalIds = new Set(
				workosOrgs.data.map((o) => o.externalId).filter((id): id is string => !!id),
			)

			// Upsert organizations from WorkOS
			yield* Effect.all(
				workosOrgs.data.map((workosOrg) =>
					collectResult(
						Effect.gen(function* () {
							// Only sync organizations that have an externalId (created through our API)
							if (!workosOrg.externalId) {
								// Skip organizations created directly in WorkOS without going through our API
								return
							}

							const orgId = workosOrg.externalId as OrganizationId
							const existingOrg = existingOrgMap.get(orgId)

							if (existingOrg) {
								// Update existing organization
								yield* orgRepo
									.update({
										id: orgId,
										name: workosOrg.name,
									})
									.pipe(withSystemActor)
								result.updated++
							} else {
								// Create new organization (edge case: org exists in WorkOS but not in our DB)
								yield* orgRepo
									.insert({
										name: workosOrg.name,
										slug: workosOrg.name
											.toLowerCase()
											.replace(/[^a-z0-9]+/g, "-")
											.replace(/^-|-$/g, ""),
										logoUrl: null,
										settings: null,
										deletedAt: null,
									})
									.pipe(withSystemActor)
								result.created++
							}
						}),
						() => {}, // Success already handled in the effect
						(error) => {
							result.errors.push(`Error syncing org ${workosOrg.id}: ${error}`)
						},
					),
				),
				{ concurrency: "unbounded" },
			)

			// Soft delete organizations that no longer exist in WorkOS
			yield* Effect.all(
				existingOrgs
					.filter((org) => !workosOrgExternalIds.has(org.id))
					.map((org) =>
						collectResult(
							orgRepo.softDelete(org.id).pipe(withSystemActor),
							() => result.deleted++,
							(error) => {
								result.errors.push(`Error deleting org ${org.id}: ${error}`)
							},
						),
					),
				{ concurrency: "unbounded" },
			)

			return result
		})

		// Sync organization memberships
		const syncOrganizationMemberships = (organizationId: OrganizationId) =>
			Effect.gen(function* () {
				const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: [] }

				// Fetch memberships from WorkOS using our organization ID
				const workosMembershipsResult = yield* pipe(
					workos.call((client) =>
						client.userManagement.listOrganizationMemberships({
							organizationId: organizationId,
							limit: 100,
						}),
					),
					Effect.either,
				)

				if (workosMembershipsResult._tag === "Left") {
					result.errors.push(
						`Failed to fetch memberships for org ${organizationId}: ${workosMembershipsResult.left}`,
					)
					return result
				}

				const workosMemberships = workosMembershipsResult.right

				// Get all existing memberships for this org
				const existingMemberships = yield* orgMemberRepo.findAllByOrganization(organizationId)

				// Get all users to map external IDs to internal IDs
				const users = yield* userRepo.findAllActive()
				const userMap = new Map(users.map((u) => [u.externalId, u]))

				// Create a map of existing memberships by userId
				const existingMembershipMap = new Map(existingMemberships.map((m) => [m.userId, m]))

				// Track which memberships we've seen from WorkOS
				const seenUserIds = new Set<string>()

				// Upsert memberships from WorkOS
				yield* Effect.all(
					workosMemberships.data.map((workosMembership) => {
						const user = userMap.get(workosMembership.userId)
						if (!user) {
							result.errors.push(`User ${workosMembership.userId} not found for membership`)
							return Effect.succeed(undefined)
						}

						seenUserIds.add(user.id)
						const existing = existingMembershipMap.get(user.id)
						const role = (workosMembership.role?.slug || "member") as "admin" | "member" | "owner"

						return collectResult(
							orgMemberRepo
								.upsertByOrgAndUser({
									organizationId: organizationId,
									userId: user.id,
									role,
									nickname: undefined,
									joinedAt: new Date(),
									invitedBy: null,
									deletedAt: null,
								})
								.pipe(withSystemActor),
							() => {
								if (existing) {
									result.updated++
								} else {
									result.created++
								}
							},
							(error) => {
								result.errors.push(
									`Error syncing membership for user ${workosMembership.userId}: ${error}`,
								)
							},
						)
					}),
					{ concurrency: "unbounded" },
				)

				// Soft delete memberships that no longer exist in WorkOS
				yield* Effect.all(
					existingMemberships
						.filter((membership) => {
							const user = users.find((u) => u.id === membership.userId)
							return (
								!seenUserIds.has(membership.userId) && !user?.externalId.startsWith("mock_")
							)
						})
						.map((membership) =>
							collectResult(
								orgMemberRepo
									.softDeleteByOrgAndUser(organizationId, membership.userId)
									.pipe(withSystemActor),
								() => result.deleted++,
								(error) => {
									result.errors.push(`Error removing membership: ${error}`)
								},
							),
						),
					{ concurrency: "unbounded" },
				)

				return result
			})

		// Sync invitations
		const syncInvitations = (organizationId: OrganizationId) =>
			Effect.gen(function* () {
				const result: SyncResult & { expired: number } = {
					created: 0,
					updated: 0,
					deleted: 0,
					expired: 0,
					errors: [],
				}

				// Fetch invitations from WorkOS using our organization ID
				const workosInvitationsResult = yield* pipe(
					workos.call((client) =>
						client.userManagement.listInvitations({
							organizationId: organizationId,
							limit: 100,
						}),
					),
					Effect.either,
				)

				if (workosInvitationsResult._tag === "Left") {
					result.errors.push(
						`Failed to fetch invitations for org ${organizationId}: ${workosInvitationsResult.left}`,
					)
					return result
				}

				const workosInvitations = workosInvitationsResult.right

				// Get all existing invitations for this org
				const existingInvitations = yield* invitationRepo.findAllByOrganization(organizationId)

				// Get all users to map external IDs to internal IDs
				const users = yield* userRepo.findAllActive()
				const userMap = new Map(users.map((u) => [u.externalId, u]))

				// Create a map of existing invitations by WorkOS ID
				const existingInvitationMap = new Map(
					existingInvitations.map((inv) => [inv.workosInvitationId, inv]),
				)

				// Upsert invitations from WorkOS
				yield* Effect.all(
					workosInvitations.data.map((workosInvitation) => {
						const existing = existingInvitationMap.get(workosInvitation.id)

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
						let invitedBy: UserId | null = null
						if (workosInvitation.inviterUserId) {
							const inviter = userMap.get(workosInvitation.inviterUserId)
							if (inviter) {
								invitedBy = inviter.id as UserId
							}
						}

						return collectResult(
							invitationRepo
								.upsertByWorkosId({
									workosInvitationId: workosInvitation.id,
									organizationId: organizationId,
									email: workosInvitation.email,
									invitedBy: invitedBy,
									invitedAt: new Date(workosInvitation.createdAt),
									expiresAt: new Date(workosInvitation.expiresAt),
									status,
									acceptedAt: workosInvitation.acceptedAt
										? new Date(workosInvitation.acceptedAt)
										: null,
									acceptedBy: null,
								})
								.pipe(withSystemActor),
							() => {
								if (existing) {
									result.updated++
								} else {
									result.created++
								}
							},
							(error) => {
								result.errors.push(
									`Error syncing invitation ${workosInvitation.id}: ${error}`,
								)
							},
						)
					}),
					{ concurrency: "unbounded" },
				)

				// Mark expired invitations
				const expiredResult = yield* pipe(
					invitationRepo.markExpired(),
					withSystemActor,
					Effect.either,
				)

				if (expiredResult._tag === "Right") {
					result.expired = expiredResult.right.length
				} else {
					result.errors.push(`Error marking expired invitations: ${expiredResult.left}`)
				}

				return result
			})

		// Main sync orchestrator
		const syncAll = Effect.gen(function* () {
			const result: FullSyncResult = {
				users: { created: 0, updated: 0, deleted: 0, errors: [] },
				organizations: { created: 0, updated: 0, deleted: 0, errors: [] },
				memberships: { created: 0, updated: 0, deleted: 0, errors: [] },
				invitations: { created: 0, updated: 0, deleted: 0, errors: [] },
				totalErrors: 0,
				startTime: Date.now(),
				endTime: 0,
			}

			yield* Effect.logInfo("Starting WorkOS sync...")

			// Step 1: Sync all users
			yield* Effect.logInfo("Syncing users...")
			result.users = yield* syncUsers
			yield* Effect.logInfo(
				`Users sync complete: created=${result.users.created}, updated=${result.users.updated}, deleted=${result.users.deleted}`,
			)

			// Step 2: Sync all organizations
			yield* Effect.logInfo("Syncing organizations...")
			result.organizations = yield* syncOrganizations
			yield* Effect.logInfo(
				`Organizations sync complete: created=${result.organizations.created}, updated=${result.organizations.updated}, deleted=${result.organizations.deleted}`,
			)

			// Step 3: Sync memberships and invitations for each organization
			const organizations = yield* orgRepo.findAllActive()

			yield* Effect.all(
				organizations.map((org) =>
					Effect.gen(function* () {
						yield* Effect.logInfo(`Syncing memberships for org ${org.id}...`)
						const membershipResult = yield* syncOrganizationMemberships(org.id)
						result.memberships.created += membershipResult.created
						result.memberships.updated += membershipResult.updated
						result.memberships.deleted += membershipResult.deleted
						result.memberships.errors.push(...membershipResult.errors)

						yield* Effect.logInfo(`Syncing invitations for org ${org.id}...`)
						const invitationResult = yield* syncInvitations(org.id as OrganizationId)
						result.invitations.created += invitationResult.created
						result.invitations.updated += invitationResult.updated
						result.invitations.deleted += invitationResult.deleted
						result.invitations.errors.push(...invitationResult.errors)
					}),
				),
				{ concurrency: 5 },
			)

			// Calculate total errors
			result.totalErrors =
				result.users.errors.length +
				result.organizations.errors.length +
				result.memberships.errors.length +
				result.invitations.errors.length

			result.endTime = Date.now()
			const duration = (result.endTime - result.startTime) / 1000

			yield* Effect.logInfo(`WorkOS sync completed in ${duration}s with ${result.totalErrors} errors`)

			if (result.totalErrors > 0) {
				yield* Effect.logError("Sync errors:", {
					users: result.users.errors,
					organizations: result.organizations.errors,
					memberships: result.memberships.errors,
					invitations: result.invitations.errors,
				})
			}

			return result
		})

		// Process WorkOS webhook event
		const processWebhookEvent = (event: Event) =>
			pipe(
				Effect.gen(function* () {
					const typedEvent = event

					switch (typedEvent.event) {
						case "user.created":
						case "user.updated": {
							const userData = {
								externalId: typedEvent.data.id,
								email: typedEvent.data.email,
								firstName: typedEvent.data.firstName || "",
								lastName: typedEvent.data.lastName || "",
								avatarUrl:
									typedEvent.data.profilePictureUrl ||
									`https://avatar.vercel.sh/${typedEvent.data.id}.svg`,
								status: "offline" as const,
								lastSeen: new Date(),
								settings: null,
								deletedAt: null,
							}
							yield* userRepo.upsertByExternalId(userData)
							break
						}

						case "user.deleted": {
							yield* userRepo.softDeleteByExternalId(typedEvent.data.id)
							break
						}

						case "organization.created":
						case "organization.updated": {
							// Only sync organizations that have an externalId (created through our API)
							if (!typedEvent.data.externalId) {
								yield* Effect.logWarning(
									`Skipping organization ${typedEvent.data.id} - no externalId set`,
								)
								break
							}

							const orgId = typedEvent.data.externalId as OrganizationId
							const existingOrg = yield* orgRepo.findById(orgId).pipe(withSystemActor)

							if (Option.isSome(existingOrg)) {
								// Update existing organization
								yield* orgRepo
									.update({
										id: orgId,
										name: typedEvent.data.name,
									})
									.pipe(withSystemActor)
							} else {
								// Create new organization (edge case: org exists in WorkOS but not in our DB)
								yield* orgRepo
									.insert({
										name: typedEvent.data.name,
										logoUrl: null,
										settings: null,
										deletedAt: null,
										slug: typedEvent.data.name
											.toLowerCase()
											.replace(/[^a-z0-9]+/g, "-")
											.replace(/^-|-$/g, ""),
									})
									.pipe(withSystemActor)
							}
							break
						}

						case "organization.deleted": {
							// Only sync organizations that have an externalId
							if (!typedEvent.data.externalId) {
								yield* Effect.logWarning(
									`Skipping organization deletion ${typedEvent.data.id} - no externalId set`,
								)
								break
							}

							const orgId = typedEvent.data.externalId as OrganizationId
							yield* orgRepo.softDelete(orgId).pipe(withSystemActor)
							break
						}

						case "organization_membership.added":
						case "organization_membership.updated": {
							// organizationId in WorkOS is now our organization ID (externalId)
							const orgId = typedEvent.data.organizationId as OrganizationId

							// Get the organization and user
							const org = yield* orgRepo.findById(orgId).pipe(withSystemActor)
							const user = yield* userRepo.findByExternalId(typedEvent.data.userId)

							if (Option.isSome(org) && Option.isSome(user)) {
								yield* orgMemberRepo.upsertByOrgAndUser({
									organizationId: org.value.id,
									nickname: null,
									userId: user.value.id,
									role: (typedEvent.data.role.slug || "member") as
										| "admin"
										| "member"
										| "owner",
									joinedAt: new Date(),
									invitedBy: null,
									deletedAt: null,
								})
							}
							break
						}

						case "organization_membership.removed": {
							// organizationId in WorkOS is now our organization ID (externalId)
							const orgId = typedEvent.data.organizationId as OrganizationId

							const org = yield* orgRepo.findById(orgId).pipe(withSystemActor)
							const user = yield* userRepo.findByExternalId(typedEvent.data.userId)

							if (Option.isSome(org) && Option.isSome(user)) {
								yield* orgMemberRepo.softDeleteByOrgAndUser(org.value.id, user.value.id)
							}
							break
						}

						default:
							yield* Effect.logInfo(`Unhandled WorkOS event type: ${typedEvent.event}`)
					}

					return { success: true }
				}),
				Effect.catchAll((error) => Effect.succeed({ success: false, error: String(error) })),
			)

		return {
			syncUsers,
			syncOrganizations,
			syncOrganizationMemberships,
			syncInvitations,
			syncAll,
			processWebhookEvent,
		}
	}),
	dependencies: [
		WorkOS.Default,
		UserRepo.Default,
		OrganizationRepo.Default,
		OrganizationMemberRepo.Default,
		InvitationRepo.Default,
		DatabaseLive,
	],
}) {}
