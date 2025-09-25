import { ModelRepository, schema } from "@hazel/db"
import { ChannelMember } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class ChannelMemberRepo extends Effect.Service<ChannelMemberRepo>()("ChannelMemberRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.channelMembersTable,
			ChannelMember.Model,
			{
				idColumn: "id",
				name: "ChannelMember",
			},
		)

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
