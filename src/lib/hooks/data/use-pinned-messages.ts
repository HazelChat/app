import { useQuery } from "@rocicorp/zero/solid"
import { type Accessor, createMemo } from "solid-js"
import { useZero } from "~/lib/zero-context"

export const usePinnedMessages = (channelId: Accessor<string>) => {
	const z = useZero()

	const pinnedMessagesQuery = createMemo(() =>
		z.query.pinnedMessages
			.where((eq) => eq.cmp("channelId", "=", channelId()))
			.related("message", (eq) => eq.related("author")),
	)

	const [pinnedMessages, status] = useQuery(pinnedMessagesQuery)

	const isLoading = createMemo(() => status().type !== "complete")

	return { pinnedMessages, isLoading }
}
