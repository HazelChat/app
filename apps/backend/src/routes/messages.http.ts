import { HttpApiBuilder } from "@effect/platform"
import type { AttachmentId } from "@hazel/domain/ids"
import { Effect } from "effect"
import { HazelApi } from "../api"
import { MessageService } from "../services/message"

export const HttpMessagesLive = HttpApiBuilder.group(HazelApi, "messages", (handlers) =>
	handlers
		.handle("create", ({ payload }) =>
			Effect.gen(function* () {
				const service = yield* MessageService
				return yield* service.create({
					...payload,
					attachmentIds: payload.attachmentIds
						? ([...payload.attachmentIds] as AttachmentId[])
						: undefined,
				})
			}),
		)
		.handle("update", ({ path, payload }) =>
			Effect.gen(function* () {
				const service = yield* MessageService
				return yield* service.update(path.id, payload)
			}),
		)
		.handle("delete", ({ path }) =>
			Effect.gen(function* () {
				const service = yield* MessageService
				return yield* service.delete(path.id)
			}),
		),
)
