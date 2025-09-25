import { and, Database, eq, isNull, ModelRepository, schema } from "@hazel/db"
import { User } from "@hazel/db/models"
import type { UserId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

export class UserRepo extends Effect.Service<UserRepo>()("UserRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.usersTable, User.Model, {
			idColumn: "id",
			name: "User",
		})
		const db = yield* Database.Database

		const findByExternalId = (externalId: string) =>
			db
				.execute((client) =>
					client
						.select()
						.from(schema.usersTable)
						.where(eq(schema.usersTable.externalId, externalId))
						.limit(1),
				)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		const upsertByExternalId = (data: Schema.Schema.Type<typeof User.Insert>) =>
			db
				.execute((client) =>
					client
						.insert(schema.usersTable)
						.values(data)
						.onConflictDoUpdate({
							target: schema.usersTable.externalId,
							set: {
								firstName: data.firstName,
								lastName: data.lastName,
								avatarUrl: data.avatarUrl,
								email: data.email,
								updatedAt: new Date(),
							},
						})
						.returning(),
				)
				.pipe(Effect.map((results) => results[0]))

		const findAllActive = () =>
			db.execute((client) =>
				client.select().from(schema.usersTable).where(isNull(schema.usersTable.deletedAt)),
			)

		const softDelete = (id: UserId) =>
			db.execute((client) =>
				client
					.update(schema.usersTable)
					.set({ deletedAt: new Date() })
					.where(and(eq(schema.usersTable.id, id), isNull(schema.usersTable.deletedAt))),
			)

		const softDeleteByExternalId = (externalId: string) =>
			db.execute((client) =>
				client
					.update(schema.usersTable)
					.set({ deletedAt: new Date() })
					.where(
						and(
							eq(schema.usersTable.externalId, externalId),
							isNull(schema.usersTable.deletedAt),
						),
					),
			)

		const bulkUpsertByExternalId = (users: Schema.Schema.Type<typeof User.Insert>[]) =>
			Effect.forEach(users, upsertByExternalId, { concurrency: 10 })

		return {
			...baseRepo,
			findByExternalId,
			upsertByExternalId,
			findAllActive,
			softDelete,
			softDeleteByExternalId,
			bulkUpsertByExternalId,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
