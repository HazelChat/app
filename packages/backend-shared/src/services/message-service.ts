import { Message, type MessageId } from "@maki-chat/api-schema/schema"
import { types } from "cassandra-driver"
import { Effect, pipe } from "effect"
import { MessageRepo } from "../repositories"

export class MessageService extends Effect.Service<MessageService>()("@hazel/Message/Service", {
	effect: Effect.gen(function* () {
		const repo = yield* MessageRepo

		const create = Effect.fn("Message.create")(function* (message: typeof Message.jsonCreate.Type) {
			yield* Effect.annotateCurrentSpan("message", message)

			const messageId = types.TimeUuid.now().toString() as MessageId

			yield* repo.insertVoid(
				Message.insert.make({
					id: messageId,
					...message,
				}),
			)

			return { id: messageId }
		})

		const findById = (id: MessageId) =>
			pipe(repo.findById(id), Effect.withSpan("Message.findById", { attributes: { id } }))

		const deleteMessage = (id: MessageId) =>
			pipe(repo.delete(id), Effect.withSpan("Message.delete", { attributes: { id } }))

		const update = Effect.fn("Message.update")(function* (id: MessageId, message: typeof Message.jsonUpdate.Type) {
			yield* Effect.annotateCurrentSpan("id", id)

			yield* repo.updateVoid({
				id,
				...message,
				updatedAt: undefined,
			})
		})

		return { create, findById, delete: deleteMessage, update }
	}),
	dependencies: [MessageRepo.Default],
}) {}
