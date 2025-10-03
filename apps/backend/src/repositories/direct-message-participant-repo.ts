import { and, Database, eq, inArray, isNull, ModelRepository, schema, sql } from "@hazel/db"
import { DirectMessageParticipant } from "@hazel/db/models"
import type { OrganizationId, UserId } from "@hazel/db/schema"
import { Effect, Option } from "effect"
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
			const db = yield* Database.Database

			const findExistingDmChannel = (userId1: UserId, userId2: UserId, organizationId: OrganizationId) =>
				db
					.execute((client) =>
						client
							.selectDistinct({ channel: schema.channelsTable })
							.from(schema.directMessageParticipantsTable)
							.innerJoin(
								schema.channelsTable,
								eq(schema.directMessageParticipantsTable.channelId, schema.channelsTable.id),
							)
							.where(
								and(
									eq(schema.directMessageParticipantsTable.organizationId, organizationId),
									eq(schema.channelsTable.type, "single"),
									isNull(schema.channelsTable.deletedAt),
									// Channel must have exactly both users as participants
									inArray(schema.directMessageParticipantsTable.userId, [userId1, userId2]),
								),
							)
							.groupBy(schema.channelsTable.id)
							// Ensure the channel has exactly 2 participants and they are our users
							.having(
								and(
									sql`COUNT(DISTINCT ${schema.directMessageParticipantsTable.userId}) = 2`,
									sql`COUNT(DISTINCT ${schema.directMessageParticipantsTable.userId}) FILTER (WHERE ${schema.directMessageParticipantsTable.userId} IN (${userId1}, ${userId2})) = 2`,
								),
							)
							.limit(1),
					)
					.pipe(Effect.map((results) => Option.fromNullable(results[0]?.channel)))

			return {
				...baseRepo,
				findExistingDmChannel,
			}
		}),
		dependencies: [DatabaseLive],
	},
) {}
