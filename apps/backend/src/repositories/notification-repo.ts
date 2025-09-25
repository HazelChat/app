import { ModelRepository, schema } from "@hazel/db"
import { Notification } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class NotificationRepo extends Effect.Service<NotificationRepo>()("NotificationRepo", {
	accessors: true,
	effect: Effect.gen(function* () {
		const baseRepo = yield* ModelRepository.makeRepository(
			schema.notificationsTable,
			Notification.Model,
			{
				idColumn: "id",
				name: "Notification",
			},
		)

		return baseRepo
	}),
	dependencies: [DatabaseLive],
}) {}
