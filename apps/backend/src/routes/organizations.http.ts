import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi, OrganizationSlugAlreadyExistsError } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { OrganizationPolicy } from "../policies/organization-policy"
import { OrganizationRepo } from "../repositories/organization-repo"

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

export const HttpOrganizationLive = HttpApiBuilder.group(HazelApi, "organizations", (handlers) =>
	Effect.gen(function* () {
		const db = yield* Database.Database

		return handlers
			.handle(
				"create",
				Effect.fn(function* ({ payload }) {
					const { createdOrganization, txid } = yield* db
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
									createdOrganization: {
										...createdOrganization,
										settings: createdOrganization.settings as any,
									},
									txid,
								}
							}),
						)
						.pipe(handleOrganizationDbErrors("Organization", "create"))

					return {
						data: createdOrganization,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"update",
				Effect.fn(function* ({ payload, path }) {
					const { updatedOrganization, txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								const updatedOrganization = yield* OrganizationRepo.update({
									id: path.id,

									...payload,
								}).pipe(policyUse(OrganizationPolicy.canUpdate(path.id)))

								const txid = yield* generateTransactionId()

								return {
									updatedOrganization: {
										...updatedOrganization,
										settings: updatedOrganization.settings as any,
									},
									txid,
								}
							}),
						)
						.pipe(handleOrganizationDbErrors("Organization", "update"))

					return {
						data: updatedOrganization,
						transactionId: txid,
					}
				}),
			)
			.handle(
				"delete",
				Effect.fn(function* ({ path }) {
					const { txid } = yield* db
						.transaction(
							Effect.gen(function* () {
								yield* OrganizationRepo.deleteById(path.id).pipe(
									policyUse(OrganizationPolicy.canDelete(path.id)),
								)

								const txid = yield* generateTransactionId()

								return { txid }
							}),
						)
						.pipe(withRemapDbErrors("Organization", "delete"))

					return {
						transactionId: txid,
					}
				}),
			)
	}),
)
