import { Database, eq, ModelRepository, schema, type TransactionClient } from "@hazel/db"
import { UserPresenceStatus } from "@hazel/db/models"
import { type ChannelId, policyRequire, type UserId } from "@hazel/db/schema"
import { Effect, Option, type Schema } from "effect"
import { DatabaseLive } from "../services/database"

type TxFn = <T>(fn: (client: TransactionClient) => Promise<T>) => Effect.Effect<T, any, never>

export class UserPresenceStatusRepo extends Effect.Service<UserPresenceStatusRepo>()(
	"UserPresenceStatusRepo",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const db = yield* Database.Database
			const baseRepo = yield* ModelRepository.makeRepository(
				schema.userPresenceStatusTable,
				UserPresenceStatus.Model,
				{
					idColumn: "id",
					name: "UserPresenceStatus",
				},
			)

			// Find status by user ID
			const findByUserId = (userId: UserId, tx?: TxFn) =>
				db
					.makeQuery(
						(execute, _data) =>
							execute((client) =>
								client
									.select()
									.from(schema.userPresenceStatusTable)
									.where(eq(schema.userPresenceStatusTable.userId, userId))
									.limit(1),
							),
						policyRequire("UserPresenceStatus", "select"),
					)({ userId }, tx)
					.pipe(Effect.map((results) => Option.fromNullable(results[0])))

			// Upsert user presence status
			const upsertByUserId = (
				data: Schema.Schema.Type<typeof UserPresenceStatus.Insert>,
				tx?: TxFn,
			) =>
				db
					.makeQuery(
						(execute, input: typeof data) =>
							execute((client) =>
								client
									.insert(schema.userPresenceStatusTable)
									.values(input)
									.onConflictDoUpdate({
										target: schema.userPresenceStatusTable.userId,
										set: {
											status: input.status,
											customMessage: input.customMessage,
											activeChannelId: input.activeChannelId,
											updatedAt: new Date(),
										},
									})
									.returning(),
							),
						policyRequire("UserPresenceStatus", "create"),
					)(data, tx)
					.pipe(Effect.map((results) => results[0]))

			// Update active channel for user
			const updateActiveChannel = (
				params: {
					userId: UserId
					activeChannelId: ChannelId | null
				},
				tx?: TxFn,
			) =>
				db.makeQuery(
					(execute, _data) =>
						execute((client) =>
							client
								.update(schema.userPresenceStatusTable)
								.set({
									activeChannelId: params.activeChannelId,
									updatedAt: new Date(),
								})
								.where(eq(schema.userPresenceStatusTable.userId, params.userId))
								.returning(),
						),
					policyRequire("UserPresenceStatus", "update"),
				)(params, tx)

			// Update user status
			const updateStatus = (
				params: {
					userId: UserId
					status: "online" | "away" | "busy" | "dnd" | "offline"
					customMessage?: string | null
				},
				tx?: TxFn,
			) =>
				db.makeQuery(
					(execute, _data) =>
						execute((client) =>
							client
								.update(schema.userPresenceStatusTable)
								.set({
									status: params.status,
									customMessage: params.customMessage,
									updatedAt: new Date(),
								})
								.where(eq(schema.userPresenceStatusTable.userId, params.userId))
								.returning(),
						),
					policyRequire("UserPresenceStatus", "update"),
				)(params, tx)

			return {
				...baseRepo,
				findByUserId,
				upsertByUserId,
				updateActiveChannel,
				updateStatus,
			}
		}),
		dependencies: [DatabaseLive],
	},
) {}
