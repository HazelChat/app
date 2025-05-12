import type { Message, schema } from "@maki-chat/zero"
import type { CustomMutatorDefs } from "@rocicorp/zero"
import Ably from "ably"

export const serverMutators = (clientMutators: CustomMutatorDefs<typeof schema>) =>
	({
		...clientMutators,
		messages: {
			...clientMutators.messages,
			insert: async (tx, data: Message) => {
				const channelMembers = await tx.query.channelMembers.where("channelId", "=", data.channelId!)

				const channels = channelMembers.map((member) => `notifications:${member.userId}`)

				// TODO: Make it ASYNC
				const ably = new Ably.Rest("NY2l4Q._SC2Cw:4EX9XKKwif-URelo-XiW7AuAqAjy8QzOheHhnjocjkk")

				await ably.batchPublish({
					channels: channels,
					messages: [
						{
							data: {
								...data,
							},
						},
					],
				})

				// END ASYNC

				await tx.mutate.messages.insert(data)
			},
		},
	}) as const satisfies CustomMutatorDefs<typeof schema>
