import { HttpApiBuilder } from "@effect/platform"
import { Database } from "@hazel/db"
import { InternalServerError, policyUse, withRemapDbErrors } from "@hazel/effect-lib"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { generateTransactionId } from "../lib/create-transactionId"
import { OrganizationPolicy } from "../policies/organization-policy"
import { OrganizationRepo } from "../repositories/organization-repo"

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
						.pipe(withRemapDbErrors("Organization", "create"))

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
						.pipe(withRemapDbErrors("Organization", "update"))

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
