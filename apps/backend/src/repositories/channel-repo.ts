import { ModelRepository, schema } from "@hazel/db"
import { Channel } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class ChannelRepo extends Effect.Service<ChannelRepo>()("ChannelRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.channelsTable, Channel.Model, {
			idColumn: "id",
			name: "Channel",
		})

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
