import { ModelRepository, schema } from "@hazel/db"
import { Message } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class MessageRepo extends Effect.Service<MessageRepo>()("MessageRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(schema.messagesTable, Message.Model, {
			idColumn: "id",
			name: "Message",
		})

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
