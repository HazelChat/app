import { Database } from "@hazel/db"
import { InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { generateTransactionId } from "../../lib/create-transactionId"
import { OrganizationPolicy } from "../../policies/organization-policy"
import { OrganizationRepo } from "../../repositories/organization-repo"
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

		return {
			"organization.create": (payload) =>
				db
					.transaction(
						Effect.gen(function* () {
							const createdOrganization = yield* OrganizationRepo.insert({
								...payload,
								deletedAt: null,
							}).pipe(
								Effect.map((res) => res[0]!),
								policyUse(OrganizationPolicy.canCreate()),
							)

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
		}
	}),
)
