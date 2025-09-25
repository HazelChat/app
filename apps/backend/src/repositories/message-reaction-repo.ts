import { ModelRepository, schema } from "@hazel/db"
import { MessageReaction } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class MessageReactionRepo extends Effect.Service<MessageReactionRepo>()("MessageReactionRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.messageReactionsTable,
			MessageReaction.Model,
			{
				idColumn: "id",
				name: "MessageReaction",
			},
		)

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
