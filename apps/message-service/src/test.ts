import { Model, SqlClient } from "@effect/sql"
import { ChannelId, Message, MessageId, UserId } from "@maki-chat/api-schema/schema"
import { SqlCassandra } from "@maki-chat/backend-shared"
import { MessageRepo } from "@maki-chat/backend-shared/repositories"
import { types } from "cassandra-driver"
import { String, pipe } from "effect"
import { Option } from "effect"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { nanoid } from "nanoid"

const SqlLive = SqlCassandra.layer({
	contactPoints: ["127.0.0.1"],
	localDataCenter: "datacenter1",
	keyspace: "chat",
	transformQueryNames: String.camelToSnake,
})

const simpleTest = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient
	const repo = yield* MessageRepo

	yield* Console.log("Testing Cassandra connection...")

	const messageId = types.TimeUuid.now()
	const create = (message: typeof Message.jsonCreate.Type) =>
		pipe(
			repo.insertVoid(
				Message.insert.make({
					id: MessageId.make(messageId.toString()),
					...message,
				}),
			),
			Effect.withSpan("Message.create", { attributes: { message } }),
		)

	const channelId = ChannelId.make(`cha_${nanoid(10)}`)
	const authorId = UserId.make(`usr_${nanoid(10)}`)

	yield* create({
		content: "Hello, world!",
		channelId: channelId,
		threadChannelId: Option.none(),
		authorId: authorId,
		replyToMessageId: Option.none(),
		attachedFiles: ["lol"],
	}).pipe(
		Effect.repeat({
			times: 100000,
		}),
	)
})

const main = simpleTest.pipe(
	Effect.provide(MessageRepo.Default),
	Effect.provide(SqlLive),
	Effect.catchAll((error) => Console.error(`Error: ${error}`)),
)

Effect.runPromise(main)
