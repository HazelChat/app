import { ModelRepository, schema } from "@hazel/db"
import { DirectMessageParticipant } from "@hazel/db/models"
import { Effect } from "effect"
import { DatabaseLive } from "../services/database"

export class DirectMessageParticipantRepo extends Effect.Service<DirectMessageParticipantRepo>()(
	"DirectMessageParticipantRepo",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const baseRepo = yield* ModelRepository.makeRepository(
				schema.directMessageParticipantsTable,
				DirectMessageParticipant.Model,
				{
					idColumn: "id",
					name: "DirectMessageParticipant",
				},
			)

			return baseRepo
		}),
		dependencies: [DatabaseLive],
	},
) {}
