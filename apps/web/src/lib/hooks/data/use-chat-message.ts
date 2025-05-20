import { createQuery } from "@rocicorp/zero/solid"
import { type Accessor, createMemo } from "solid-js"
import { useZero } from "~/lib/zero/zero-context"

export const useChatMessage = (id: Accessor<string>) => {
	const z = useZero()

	const messageQuery = createMemo(() =>
		z.query.messages
			.related("author")
			.where(({ cmp }) => cmp("id", "=", id()))
			.one(),
	)

	const [message, messagesResult] = createQuery(messageQuery)

	const isLoading = createMemo(() => messagesResult().type !== "complete")

	return { message, isLoading }
}
