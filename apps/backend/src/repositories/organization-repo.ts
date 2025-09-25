import { and, Database, eq, isNull, ModelRepository, schema } from "@hazel/db"
import { Organization } from "@hazel/db/models"
import type { OrganizationId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

export class OrganizationRepo extends Effect.Service<OrganizationRepo>()("OrganizationRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.organizationsTable,
			Organization.Model,
			{
				idColumn: "id",
				name: "Organization",
			},
		)
		const db = yield* Database.Database

		// Extended methods for WorkOS sync
		const findByWorkosId = (workosId: string) =>
			db
				.execute((client) =>
					client
						.select()
						.from(schema.organizationsTable)
						.where(eq(schema.organizationsTable.workosId, workosId))
						.limit(1),
				)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		const upsertByWorkosId = (data: Schema.Schema.Type<typeof Organization.Insert>) =>
			db
				.execute((client) =>
					client
						.insert(schema.organizationsTable)
						.values({
							name: data.name,
							workosId: data.workosId,
						})
						.onConflictDoUpdate({
							target: schema.organizationsTable.workosId,
							set: {
								name: data.name,
							},
						})
						.returning(),
				)
				.pipe(Effect.map((results) => results[0]))

		const findAllActive = () =>
			db.execute((client) =>
				client
					.select()
					.from(schema.organizationsTable)
					.where(isNull(schema.organizationsTable.deletedAt)),
			)

		const softDelete = (id: OrganizationId) =>
			db.execute((client) =>
				client
					.update(schema.organizationsTable)
					.set({ deletedAt: new Date() })
					.where(
						and(
							eq(schema.organizationsTable.id, id),
							isNull(schema.organizationsTable.deletedAt),
						),
					),
			)

		const softDeleteByWorkosId = (workosId: string) =>
			db.execute((client) =>
				client
					.update(schema.organizationsTable)
					.set({ deletedAt: new Date() })
					.where(
						and(
							eq(schema.organizationsTable.workosId, workosId),
							isNull(schema.organizationsTable.deletedAt),
						),
					),
			)

		const bulkUpsertByWorkosId = (organizations: Schema.Schema.Type<typeof Organization.Insert>[]) =>
			Effect.forEach(organizations, upsertByWorkosId, { concurrency: 10 })

		return {
			...baseRepo,
			findByWorkosId,
			upsertByWorkosId,
			findAllActive,
			softDelete,
			softDeleteByWorkosId,
			bulkUpsertByWorkosId,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
