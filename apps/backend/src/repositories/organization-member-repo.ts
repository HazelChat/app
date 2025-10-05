import { and, Database, eq, isNull, ModelRepository, schema, type TransactionClient } from "@hazel/db"
import { OrganizationMember } from "@hazel/db/models"
import { type OrganizationId, type OrganizationMemberId, policyRequire, type UserId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class OrganizationMemberRepo extends Effect.Service<OrganizationMemberRepo>()(
	"OrganizationMemberRepo",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const baseRepo = yield* ModelRepository.makeRepository(
				schema.organizationMembersTable,
				OrganizationMember.Model,
				{
					idColumn: "id",
					name: "OrganizationMember",
				},
			)
			const db = yield* Database.Database

			// Extended methods for WorkOS sync
			const findByOrgAndUser = (organizationId: OrganizationId, userId: UserId, tx?: TxFn) =>
				db
					.makeQuery(
						(execute, data: { organizationId: OrganizationId; userId: UserId }) =>
							execute((client) =>
								client
									.select()
									.from(schema.organizationMembersTable)
									.where(
										and(
											eq(
												schema.organizationMembersTable.organizationId,
												data.organizationId,
											),
											eq(schema.organizationMembersTable.userId, data.userId),
											isNull(schema.organizationMembersTable.deletedAt),
										),
									)
									.limit(1),
							),
						policyRequire("OrganizationMember", "select"),
					)({ organizationId, userId }, tx)
					.pipe(Effect.map((results) => Option.fromNullable(results[0])))

			const upsertByOrgAndUser = (
				data: Schema.Schema.Type<typeof OrganizationMember.Insert>,
				tx?: TxFn,
			) =>
				db.makeQuery(
					(execute, input: typeof data) =>
						execute(async (client) => {
							// First check if exists
							const existing = await client
								.select()
								.from(schema.organizationMembersTable)
								.where(
									and(
										eq(
											schema.organizationMembersTable.organizationId,
											input.organizationId,
										),
										eq(schema.organizationMembersTable.userId, input.userId),
									),
								)
								.limit(1)

							if (existing.length > 0) {
								// Update existing
								const result = await client
									.update(schema.organizationMembersTable)
									.set({
										role: input.role,
										deletedAt: null,
									})
									.where(eq(schema.organizationMembersTable.id, existing[0].id))
									.returning()
								return result[0]
							} else {
								// Insert new
								const result = await client
									.insert(schema.organizationMembersTable)
									.values(input)
									.returning()
								return result[0]
							}
						}),
					policyRequire("OrganizationMember", "create"),
				)(data, tx)

			const findAllByOrganization = (organizationId: OrganizationId, tx?: TxFn) =>
				db.makeQuery(
					(execute, orgId: OrganizationId) =>
						execute((client) =>
							client
								.select()
								.from(schema.organizationMembersTable)
								.where(
									and(
										eq(schema.organizationMembersTable.organizationId, orgId),
										isNull(schema.organizationMembersTable.deletedAt),
									),
								),
						),
					policyRequire("OrganizationMember", "select"),
				)(organizationId, tx)

			const findAllActive = (tx?: TxFn) =>
				db.makeQuery(
					(execute, _data: {}) =>
						execute((client) =>
							client
								.select()
								.from(schema.organizationMembersTable)
								.where(isNull(schema.organizationMembersTable.deletedAt)),
						),
					policyRequire("OrganizationMember", "select"),
				)({}, tx)

			const softDelete = (id: OrganizationMemberId, tx?: TxFn) =>
				db.makeQuery(
					(execute, memberId: OrganizationMemberId) =>
						execute((client) =>
							client
								.update(schema.organizationMembersTable)
								.set({ deletedAt: new Date() })
								.where(
									and(
										eq(schema.organizationMembersTable.id, memberId),
										isNull(schema.organizationMembersTable.deletedAt),
									),
								),
						),
					policyRequire("OrganizationMember", "delete"),
				)(id, tx)

			const softDeleteByOrgAndUser = (organizationId: OrganizationId, userId: UserId, tx?: TxFn) =>
				db.makeQuery(
					(execute, data: { organizationId: OrganizationId; userId: UserId }) =>
						execute((client) =>
							client
								.update(schema.organizationMembersTable)
								.set({ deletedAt: new Date() })
								.where(
									and(
										eq(
											schema.organizationMembersTable.organizationId,
											data.organizationId,
										),
										eq(schema.organizationMembersTable.userId, data.userId),
										isNull(schema.organizationMembersTable.deletedAt),
									),
								),
						),
					policyRequire("OrganizationMember", "delete"),
				)({ organizationId, userId }, tx)

			const bulkUpsertByOrgAndUser = (
				members: Schema.Schema.Type<typeof OrganizationMember.Insert>[],
			) => Effect.forEach(members, (data) => upsertByOrgAndUser(data), { concurrency: 10 })

			return {
				...baseRepo,
				findByOrgAndUser,
				upsertByOrgAndUser,
				findAllByOrganization,
				findAllActive,
				softDelete,
				softDeleteByOrgAndUser,
				bulkUpsertByOrgAndUser,
			}
		}),
		dependencies: [DatabaseLive],
	},
) {}
