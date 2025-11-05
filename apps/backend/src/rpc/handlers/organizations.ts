import { Database } from "@hazel/db"
import {
	CurrentUser,
	InternalServerError,
	policyUse,
	withRemapDbErrors,
	withSystemActor,
} from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { OrganizationPolicy } from "../../policies/organization-policy"
import { OrganizationMemberRepo } from "../../repositories/organization-member-repo"
import { OrganizationRepo } from "../../repositories/organization-repo"
import { UserRepo } from "../../repositories/user-repo"
import { WorkOS } from "../../services/workos"
import { OrganizationRpcs, OrganizationSlugAlreadyExistsError } from "../groups/organizations"

/**
 * Custom error handler for organization database operations that provides
 * specific error handling for duplicate slug violations
 */
const handleOrganizationDbErrors = <R, E extends { _tag: string }, A>(
	entityType: string,
	action: "update" | "create",
) => {
	return (
		effect: Effect.Effect<R, E, A>,
	): Effect.Effect<
		R,
		| Exclude<E, { _tag: "DatabaseError" | "ParseError" }>
		| InternalServerError
		| OrganizationSlugAlreadyExistsError,
		A
	> => {
		return effect.pipe(
			Effect.catchTags({
				DatabaseError: (err: any) => {
					// Check if it's a unique violation on the slug column
					if (
						err.type === "unique_violation" &&
						err.cause.constraint_name === "organizations_slug_unique"
					) {
						// Extract slug from error detail if possible
						const slugMatch = err.cause.detail?.match(/Key \(slug\)=\(([^)]+)\)/)
						const slug = slugMatch?.[1] || "unknown"
						return Effect.fail(
							new OrganizationSlugAlreadyExistsError({
								message: `Organization slug '${slug}' is already taken`,
								slug,
							}),
						)
					}
					// For other database errors, return a generic internal server error
					return Effect.fail(
						new InternalServerError({
							message: `Error ${action}ing ${entityType}`,
							detail: `There was a database error when ${action}ing the ${entityType}`,
							cause: String(err),
						}),
					)
				},
				ParseError: (err: any) =>
					Effect.fail(
						new InternalServerError({
							message: `Error ${action}ing ${entityType}`,
							detail: `There was an error in parsing when ${action}ing the ${entityType}`,
							cause: String(err),
						}),
					),
			}),
		)
	}
}

/**
 * Organization RPC Handlers
 *
 * Implements the business logic for all organization-related RPC methods.
 * Each handler receives the payload and has access to CurrentUser via Effect context
 * (provided by AuthMiddleware).
 *
 * All handlers use:
 * - Database transactions for atomicity
 * - Policy checks for authorization
 * - Transaction IDs for optimistic updates
 * - Error remapping for consistent error handling including slug uniqueness violations
 */
export const OrganizationRpcLive = OrganizationRpcs.toLayer(
	Effect.gen(function* () {
		const db = yield* Database.Database
		const workos = yield* WorkOS

		return {
			"organization.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							// Get current user from context
							const currentUser = yield* CurrentUser.Context

							// Get the user's external ID (WorkOS user ID)
							const userOption = yield* UserRepo.findById(currentUser.id).pipe(
								Effect.orDie,
								withSystemActor,
							)
							if (userOption._tag === "None") {
								return yield* Effect.fail(
									new InternalServerError({
										message: "User not found",
										detail: `Could not find user with ID ${currentUser.id}`,
									}),
								)
							}

							const user = userOption.value

							// Create organization in local database first
							const createdOrganization = yield* OrganizationRepo.insert({
								name: payload.name,
								slug: payload.slug,
								logoUrl: payload.logoUrl,
								settings: payload.settings,
								deletedAt: null,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(OrganizationPolicy.canCreate()),
							)

							// Create organization in WorkOS using our DB ID as externalId
							const workosOrg = yield* workos
								.call((client) =>
									client.organizations.createOrganization({
										name: payload.name,
										externalId: createdOrganization.id,
									}),
								)
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to create organization in WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							yield* workos
								.call((client) =>
									client.userManagement.createOrganizationMembership({
										userId: user.externalId,
										organizationId: workosOrg.id,
										roleSlug: "owner",
									}),
								)
								.pipe(
									Effect.mapError(
										(error) =>
											new InternalServerError({
												message: "Failed to add user to organization in WorkOS",
												detail: String(error.cause),
												cause: String(error),
											}),
									),
								)

							yield* OrganizationMemberRepo.upsertByOrgAndUser({
								organizationId: createdOrganization.id,
								userId: currentUser.id,
								role: "owner",
								nickname: undefined,
								joinedAt: new Date(),
								invitedBy: null,
								deletedAt: null,
							}).pipe(withSystemActor)

							const txid = yield* generateTransactionId()

							return {
								data: {
									...createdOrganization,
									settings: createdOrganization.settings as any,
								},
								transactionId: txid,
							}
						}),
					)
					.pipe(handleOrganizationDbErrors("Organization", "create")),

			"organization.update": ({ id, ...payload }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* Effect.logInfo("OrganizationRepo.update", payload)
							const updatedOrganization = yield* OrganizationRepo.update({
								id,
								...payload,
							}).pipe(policyUse(OrganizationPolicy.canUpdate(id)))

							const txid = yield* generateTransactionId()

							return {
								data: {
									...updatedOrganization,
									settings: updatedOrganization.settings as any,
								},
								transactionId: txid,
							}
						}),
					)
					.pipe(handleOrganizationDbErrors("Organization", "update")),

			"organization.delete": ({ id }) =>
				db
					.transaction(
						Effect.gen(function* () {
							yield* OrganizationRepo.deleteById(id).pipe(
								policyUse(OrganizationPolicy.canDelete(id)),
							)

							const txid = yield* generateTransactionId()

							return { transactionId: txid }
						}),
					)
					.pipe(withRemapDbErrors("Organization", "delete")),

			"organization.setSlug": ({ id, slug }) =>
				db
					.transaction(
						Effect.gen(function* () {
							console.log("setSlug", id, slug)
							const updatedOrganization = yield* OrganizationRepo.update({
								id,
								slug,
							}).pipe(policyUse(OrganizationPolicy.canUpdate(id)))

							console.log("updatedOrganization", updatedOrganization)

							const txid = yield* generateTransactionId()

							return {
								data: {
									...updatedOrganization,
									settings: updatedOrganization.settings as any,
								},
								transactionId: txid,
							}
						}),
					)
					.pipe(handleOrganizationDbErrors("Organization", "update")),
		}
	}),
)
