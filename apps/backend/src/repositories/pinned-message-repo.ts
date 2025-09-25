import { ModelRepository, schema } from "@hazel/db"
import { PinnedMessage } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class PinnedMessageRepo extends Effect.Service<PinnedMessageRepo>()("PinnedMessageRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.pinnedMessagesTable,
			PinnedMessage.Model,
			{
				idColumn: "id",
				name: "PinnedMessage",
			},
		)

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
