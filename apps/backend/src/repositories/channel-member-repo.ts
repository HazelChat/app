import { and, Database, eq, isNull, ModelRepository, schema } from "@hazel/db"
import { ChannelMember } from "@hazel/db/models"
import type { ChannelId, UserId } from "@hazel/db/schema"
import { Effect, Option } from "effect"
import { DatabaseLive } from "../services/database"

export class ChannelMemberRepo extends Effect.Service<ChannelMemberRepo>()("ChannelMemberRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.channelMembersTable,
			ChannelMember.Model,
			{
				idColumn: "id",
			},
		)
		const db = yield* Database.Database

		// Extended method to find channel member by channel and user
		const findByChannelAndUser = (channelId: ChannelId, userId: UserId) =>
			db
				.execute((client) =>
					client
						.select()
						.from(schema.channelMembersTable)
						.where(
							and(
								eq(schema.channelMembersTable.channelId, channelId),
								eq(schema.channelMembersTable.userId, userId),
								isNull(schema.channelMembersTable.deletedAt),
							),
						)
						.limit(1),
				)
				.pipe(Effect.map((results) => Option.fromNullable(results[0])))

		return {
			...baseRepo,
			findByChannelAndUser,
		}
	}),
	dependencies: [DatabaseLive],
}) {}
