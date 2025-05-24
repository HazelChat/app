import { HttpApiBuilder } from "@effect/platform"
import { Effect, Option } from "effect"

import { MakiApi } from "@maki-chat/api-schema"
import { NotFound } from "@maki-chat/api-schema/errors.js"
import { MessageService } from "@maki-chat/backend-shared/services"

export const MessageApiLive = HttpApiBuilder.group(MakiApi, "Message", (handlers) =>
	Effect.gen(function* () {
		const messageService = yield* MessageService

		return handlers
			.handle(
				"createMessage",
				Effect.fnUntraced(function* ({ payload }) {
					const message = yield* messageService.create(payload)

					return { success: true, id: message.id }
				}),
			)

			.handle(
				"getMessage",
				Effect.fnUntraced(function* ({ path }) {
					const message = yield* messageService
						.findById(path.id)
						.pipe(
							Effect.flatMap(
								Option.match({
									onNone: () =>
										Effect.fail(new NotFound({ entityType: "message", entityId: path.id })),
									onSome: Effect.succeed,
								}),
							),
						)
						.pipe(Effect.tapErrorCause((cause) => Effect.logError("Failed to get message", { cause })))

					return message
				}),
			)
			.handle(
				"updateMessage",
				Effect.fnUntraced(function* ({ path, payload }) {
					yield* messageService.update(path.id, payload)
					return { success: true } as const
				}),
			)
			.handle(
				"deleteMessage",
				Effect.fnUntraced(function* ({ path }) {
					yield* messageService.delete(path.id)
					return { success: true }
				}),
			)
	}),
)
