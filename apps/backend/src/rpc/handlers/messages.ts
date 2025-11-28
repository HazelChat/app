import { MessageRpcs } from "@hazel/domain/rpc"
import { Effect } from "effect"
import { MessageService } from "../../services/message"

export const MessageRpcLive = MessageRpcs.toLayer(
	Effect.gen(function* () {
		const service = yield* MessageService

		return {
			"message.create": (payload) => service.create(payload),

			"message.update": ({ id, ...payload }) => service.update(id, payload),

			"message.delete": ({ id }) => service.delete(id),
		}
	}),
)
