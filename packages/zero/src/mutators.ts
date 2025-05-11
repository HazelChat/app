import type { CustomMutatorDefs } from "@rocicorp/zero"
import type { Message, schema } from "./schema"

export function createMutators() {
	return {
		messages: {
			insert: async (tx, data: Message) => {
				await tx.mutate.messages.insert(data)
			},
		},
	} as const satisfies CustomMutatorDefs<typeof schema>
}
