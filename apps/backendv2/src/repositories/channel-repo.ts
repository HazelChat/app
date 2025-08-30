import { Channel, Model, schema } from "@hazel/db"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class ChannelRepo extends Effect.Service<ChannelRepo>()("ChannelRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* Model.makeRepository(schema.channelsTable, Channel.Model, {
			idColumn: "id",
		})

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
