import { api } from "convex-hazel/_generated/api"
import type { Id } from "convex-hazel/_generated/dataModel"
import { type Accessor, createEffect, createMemo, createSignal, on } from "solid-js"
import { VList, type VListHandle } from "virtua/solid"
import { ChatTypingPresence } from "~/components/chat-ui/chat-typing-presence"
import { FloatingBar } from "~/components/chat-ui/floating-bar"
import { ChatMessage } from "~/components/chat-ui/message/chat-message"
import { createPaginatedQuery, createQuery } from "~/lib/convex"
import type { Message } from "~/lib/types"

const PAGE_SIZE = 30

export function Channel(props: { channelId: Accessor<Id<"channels">>; serverId: Accessor<Id<"servers">> }) {
	const channel = createQuery(api.channels.getChannel, {
		channelId: props.channelId(),
		serverId: props.serverId(),
	})

	const paginatedMessages = createPaginatedQuery(
		api.messages.getMessages,
		{
			channelId: props.channelId(),
			serverId: props.serverId(),
		},
		{
			initialNumItems: PAGE_SIZE,
		},
	)

	// Redirect when channel is not found
	// TODO: Readd once creaequery has loading state
	// createEffect(() => {
	// 	if (!channel() && !isChannelLoading()) {
	// 		navigate({
	// 			to: "/$serverId",
	// 			params: { serverId: props.serverId() },
	// 		})
	// 	}
	// })

	const processedMessages = createMemo(() => {
		const timeThreshold = 5 * 60 * 1000

		const allMessages = paginatedMessages.results().reverse()

		const result: Array<{
			message: Message
			isGroupStart: boolean
			isGroupEnd: boolean
		}> = []

		for (let i = 0; i < allMessages.length; i++) {
			const currentMessage = allMessages[i]
			const prevMessage = i > 0 ? allMessages[i - 1] : null
			const nextMessage = i < allMessages.length - 1 ? allMessages[i + 1] : null

			let isGroupStart = true
			if (prevMessage) {
				const currentTime = currentMessage._creationTime
				const prevTime = prevMessage._creationTime
				const timeDiff = currentTime - prevTime
				if (
					currentMessage.authorId === prevMessage.authorId &&
					timeDiff < timeThreshold &&
					!prevMessage.replyToMessageId
				) {
					isGroupStart = false
				}
			}

			let isGroupEnd = true
			if (nextMessage) {
				const currentTime = currentMessage._creationTime
				const nextTime = nextMessage._creationTime
				const timeDiff = nextTime - currentTime
				if (currentMessage.authorId === nextMessage.authorId && timeDiff < timeThreshold) {
					isGroupEnd = false
				}
			}

			result.push({ message: currentMessage, isGroupStart, isGroupEnd })
		}

		return result
	})

	const [shouldStickToBottom, setShouldStickToBottom] = createSignal(true)
	const [vlistRef, setVlistRef] = createSignal<VListHandle | undefined>(undefined)

	createEffect(
		on([processedMessages, vlistRef], () => {
			const ref = vlistRef()
			if (!ref) return
			if (!shouldStickToBottom()) return

			// Wait for next animation frame to ensure the scroll position is updated
			setTimeout(() => {
				ref.scrollToIndex(processedMessages().length - 1, {
					smooth: false,
					align: "end",
				})
			}, 0)
		}),
	)

	return (
		<div class="flex flex-1 flex-col">
			<VList
				class="flex-1"
				overscan={7}
				shift
				data={processedMessages()}
				ref={setVlistRef}
				onScroll={async (offset) => {
					if (!vlistRef()) {
						return
					}

					setShouldStickToBottom(offset >= vlistRef()!.scrollSize - vlistRef()!.viewportSize - 120)

					if (offset < 300) {
						if (paginatedMessages.status() === "CanLoadMore") {
							paginatedMessages.loadMore(PAGE_SIZE)
						}
					}
				}}
			>
				{(message) => (
					<ChatMessage
						message={() => message.message}
						isGroupStart={() => message.isGroupStart}
						isGroupEnd={() => message.isGroupEnd}
						isFirstNewMessage={() =>
							message.message._id === channel()?.currentUser?.lastSeenMessageId
						}
						serverId={props.serverId}
						isThread={() => false}
					/>
				)}
			</VList>
			<div class="mx-2 flex flex-col gap-1.5">
				<FloatingBar />
				<ChatTypingPresence />
			</div>
		</div>
	)
}
