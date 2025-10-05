import { and, Database, eq, isNull, ModelRepository, schema, type TransactionClient } from "@hazel/db"
import { User } from "@hazel/db/models"
import { policyRequire, type UserId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class UserRepo extends Effect.Service<UserRepo>()("UserRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.usersTable, User.Model, {
			idColumn: "id",
			name: "User",
		})
		const db = yield* Database.Database

		const findByExternalId = (externalId: string, tx?: TxFn) =>
			db
				.makeQuery(
					(execute, id: string) =>
						execute((client) =>
							client
								.select()
								.from(schema.usersTable)
								.where(eq(schema.usersTable.externalId, id))
								.limit(1),
						),
					policyRequire("User", "select"),
				)(externalId, tx)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		const upsertByExternalId = (data: Schema.Schema.Type<typeof User.Insert>, tx?: TxFn) =>
			db
				.makeQuery(
					(execute, input: typeof data) =>
						execute((client) =>
							client
								.insert(schema.usersTable)
								.values(input)
								.onConflictDoUpdate({
									target: schema.usersTable.externalId,
									set: {
										firstName: input.firstName,
										lastName: input.lastName,
										avatarUrl: input.avatarUrl,
										email: input.email,
										updatedAt: new Date(),
									},
								})
								.returning(),
						),
					policyRequire("User", "create"),
				)(data, tx)
				.pipe(Effect.map((results) => results[0]))

		const findAllActive = (tx?: TxFn) =>
			db.makeQuery(
				(execute, _data: {}) =>
					execute((client) =>
						client.select().from(schema.usersTable).where(isNull(schema.usersTable.deletedAt)),
					),
				policyRequire("User", "select"),
			)({}, tx)

		const softDelete = (id: UserId, tx?: TxFn) =>
			db.makeQuery(
				(execute, userId: UserId) =>
					execute((client) =>
						client
							.update(schema.usersTable)
							.set({ deletedAt: new Date() })
							.where(
								and(eq(schema.usersTable.id, userId), isNull(schema.usersTable.deletedAt)),
							),
					),
				policyRequire("User", "delete"),
			)(id, tx)

		const softDeleteByExternalId = (externalId: string, tx?: TxFn) =>
			db.makeQuery(
				(execute, id: string) =>
					execute((client) =>
						client
							.update(schema.usersTable)
							.set({ deletedAt: new Date() })
							.where(
								and(
									eq(schema.usersTable.externalId, id),
									isNull(schema.usersTable.deletedAt),
								),
							),
					),
				policyRequire("User", "delete"),
			)(externalId, tx)

		const bulkUpsertByExternalId = (users: Schema.Schema.Type<typeof User.Insert>[]) =>
			Effect.forEach(users, (data) => upsertByExternalId(data), { concurrency: 10 })

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
