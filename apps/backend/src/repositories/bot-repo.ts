import { Database, ModelRepository, schema } from "@hazel/db"
import { policyRequire, type UserId } from "@hazel/domain"
import { Bot } from "@hazel/domain/models"
import { eq } from "drizzle-orm"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"

export class BotRepo extends Effect.Service<BotRepo>()("BotRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.botsTable, Bot.Model, {
			idColumn: "id",
			name: "Bot",
		})

		const db = yield* Database.Database

		const findByTokenHash = (hash: string) =>
			db.makeQuery(
				(execute, hash: string) =>
					execute((client) =>
						client
							.select()
							.from(schema.botsTable)
							.where(eq(schema.botsTable.apiTokenHash, hash))
							.limit(1),
					).pipe(Effect.map((res) => Option.fromNullable(res[0]))),
				policyRequire("Bot", "select"),
			)(hash)

		const findByUserId = (userId: UserId) =>
			db.makeQuery(
				(execute, userId: UserId) =>
					execute((client) =>
						client
							.select()
							.from(schema.botsTable)
							.where(eq(schema.botsTable.userId, userId))
							.limit(1),
					).pipe(Effect.map((res) => Option.fromNullable(res[0]))),
				policyRequire("Bot", "select"),
			)(userId)

		return {
			...baseRepo,
			findByTokenHash,
			findByUserId,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
