import { and, Database, eq, isNull, ModelRepository, schema } from "@hazel/db"
import { OrganizationMember } from "@hazel/db/models"
import type { OrganizationId, OrganizationMemberId, UserId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

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
				},
			)
			const db = yield* Database.Database

			// Extended methods for WorkOS sync
			const findByOrgAndUser = (organizationId: OrganizationId, userId: UserId) =>
				db
					.execute((client) =>
						client
							.select()
							.from(schema.organizationMembersTable)
							.where(
								and(
									eq(schema.organizationMembersTable.organizationId, organizationId),
									eq(schema.organizationMembersTable.userId, userId),
									isNull(schema.organizationMembersTable.deletedAt),
								),
							)
							.limit(1),
					)
					.pipe(Effect.map((results) => Option.fromNullable(results[0])))

			const upsertByOrgAndUser = (data: Schema.Schema.Type<typeof OrganizationMember.Insert>) =>
				db.execute(async (client) => {
					// First check if exists
					const existing = await client
						.select()
						.from(schema.organizationMembersTable)
						.where(
							and(
								eq(schema.organizationMembersTable.organizationId, data.organizationId),
								eq(schema.organizationMembersTable.userId, data.userId),
							),
						)
						.limit(1)

					if (existing.length > 0) {
						// Update existing
						const result = await client
							.update(schema.organizationMembersTable)
							.set({
								role: data.role,
								deletedAt: null,
							})
							.where(eq(schema.organizationMembersTable.id, existing[0].id))
							.returning()
						return result[0]
					} else {
						// Insert new
						const result = await client
							.insert(schema.organizationMembersTable)
							.values(data)
							.returning()
						return result[0]
					}
				})

			const findAllByOrganization = (organizationId: OrganizationId) =>
				db.execute((client) =>
					client
						.select()
						.from(schema.organizationMembersTable)
						.where(
							and(
								eq(schema.organizationMembersTable.organizationId, organizationId),
								isNull(schema.organizationMembersTable.deletedAt),
							),
						),
				)

			const findAllActive = () =>
				db.execute((client) =>
					client
						.select()
						.from(schema.organizationMembersTable)
						.where(isNull(schema.organizationMembersTable.deletedAt)),
				)

			const softDelete = (id: OrganizationMemberId) =>
				db.execute((client) =>
					client
						.update(schema.organizationMembersTable)
						.set({ deletedAt: new Date() })
						.where(
							and(
								eq(schema.organizationMembersTable.id, id),
								isNull(schema.organizationMembersTable.deletedAt),
							),
						),
				)

			const softDeleteByOrgAndUser = (organizationId: OrganizationId, userId: UserId) =>
				db.execute((client) =>
					client
						.update(schema.organizationMembersTable)
						.set({ deletedAt: new Date() })
						.where(
							and(
								eq(schema.organizationMembersTable.organizationId, organizationId),
								eq(schema.organizationMembersTable.userId, userId),
								isNull(schema.organizationMembersTable.deletedAt),
							),
						),
				)

			const bulkUpsertByOrgAndUser = (
				members: Schema.Schema.Type<typeof OrganizationMember.Insert>[],
			) => Effect.forEach(members, upsertByOrgAndUser, { concurrency: 10 })

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
