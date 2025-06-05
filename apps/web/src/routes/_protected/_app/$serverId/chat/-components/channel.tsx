import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import {
	type Accessor,
	ErrorBoundary,
	Show,
	createEffect,
	createMemo,
	createSignal,
	on,
	onMount,
} from "solid-js"
import { VList, type VListHandle } from "virtua/solid"
import { ChatTypingPresence } from "~/components/chat-ui/chat-typing-presence"
import { FloatingBar } from "~/components/chat-ui/floating-bar"
import { ChatMessage } from "~/components/chat-ui/message/chat-message"
import { createCachedPaginatedQuery, createQuery, resetPaginationId } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import type { Message } from "~/lib/types"

const PAGE_SIZE = 30

// Skeleton component for loading messages
const MessageSkeleton = (props: { isGroupStart: boolean }) => (
	<div class="flex gap-3 px-4 py-2">
		<Show when={props.isGroupStart}>
			<div class="h-10 w-10 animate-pulse rounded-full bg-muted" />
		</Show>
		<Show when={!props.isGroupStart}>
			<div class="w-10" />
		</Show>
		<div class="flex-1 space-y-2">
			<Show when={props.isGroupStart}>
				<div class="h-4 w-24 animate-pulse rounded bg-muted" />
			</Show>
			<div class="space-y-1">
				<div class="h-4 w-3/4 animate-pulse rounded bg-muted/80" />
				<div class="h-4 w-1/2 animate-pulse rounded bg-muted/80" />
			</div>
		</div>
	</div>
)

type ListItem = ListItemMessage | ListItemSkeleton

type ListItemMessage = {
	type: "message"
	data: { message: Message; isGroupStart: boolean; isGroupEnd: boolean }
}

type ListItemSkeleton = { type: "skeleton"; id: string; isGroupStart: boolean }

// Before virtua renders
window.addEventListener("beforeunload", () => {
	console.log("Before unload RO:", typeof ResizeObserver)
})

export function Channel(props: { channelId: Accessor<Id<"channels">>; serverId: Accessor<Id<"servers">> }) {
	onMount(() => resetPaginationId())
	const channelQuery = useQuery(() =>
		convexQuery(api.channels.getChannel, {
			channelId: props.channelId(),
			serverId: props.serverId(),
		}),
	)

	const paginatedMessages = createCachedPaginatedQuery(
		api.messages.getMessages,
		{
			channelId: props.channelId(),
			serverId: props.serverId(),
		},
		{
			initialNumItems: PAGE_SIZE,
		},
		`messages:${props.serverId()}:${props.channelId()}`,
	)

	const [pendingLoads, setPendingLoads] = createSignal(0)

	// Watch for status changes and process queue when loads complete
	createEffect(() => {
		const status = paginatedMessages.status()

		if (status === "CanLoadMore" && pendingLoads() > 0) {
			setPendingLoads((prev) => prev - 1)
			paginatedMessages.loadMore(PAGE_SIZE)
		} else if (status === "Exhausted") {
			// No more messages, clear all pending loads
			setPendingLoads(0)
		}
	})

	const processedMessages = createMemo(() => {
		const timeThreshold = 5 * 60 * 1000
		const source = paginatedMessages.results()
		const allMessages = source.slice().reverse()

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

	const listData = createMemo((): ListItem[] => {
		const items: ListItem[] = []

		if (paginatedMessages.status() !== "Exhausted") {
			// Calculate total skeletons to show (current loading + pending loads)
			const totalLoadingSections =
				(paginatedMessages.status() === "LoadingMore" ? 1 : 0) + pendingLoads()

			for (let section = 0; section < totalLoadingSections; section++) {
				for (let i = 0; i < PAGE_SIZE; i++) {
					items.push({
						type: "skeleton",
						id: `skeleton-${section}-${i}`,
						isGroupStart: i === 0 || Math.random() > 0.7,
					})
				}
			}
		}

		for (const messageData of processedMessages()) {
			items.push({
				type: "message",
				data: messageData,
			})
		}

		// Add initial skeletons if no messages loaded yet
		if (processedMessages().length === 0 && paginatedMessages.status() === "LoadingFirstPage") {
			for (let i = 0; i < 15; i++) {
				items.push({
					type: "skeleton",
					id: `initial-skeleton-${i}`,
					isGroupStart: i === 0 || Math.random() > 0.7,
				})
			}
		}

		return items
	})

	const [shouldStickToBottom, setShouldStickToBottom] = createSignal(true)
	const [vlistRef, setVlistRef] = createSignal<VListHandle | undefined>(undefined)

	createEffect(
		on([processedMessages, vlistRef], () => {
			const ref = vlistRef()
			if (!ref) return
			if (!shouldStickToBottom()) return

			// Only auto-scroll if we have actual messages
			if (processedMessages().length === 0) return

			// Wait for next animation frame to ensure the scroll position is updated
			setTimeout(() => {
				ref.scrollToIndex(listData().length - 1, {
					smooth: false,
					align: "end",
				})
			}, 0)
		}),
	)

	const requestLoadMore = () => {
		const status = paginatedMessages.status()
		if (status === "CanLoadMore") {
			// If we can load immediately, do it
			paginatedMessages.loadMore(PAGE_SIZE)
		} else if (status === "LoadingMore") {
			// If currently loading, queue the request
			setPendingLoads((prev) => prev + 1)
		}
		// If exhausted, do nothing
	}

	return (
		<ErrorBoundary
			fallback={(err, reset) => {
				if (err.message?.includes("ResizeObserver")) {
					// Micro-task retry - let DOM settle
					Promise.resolve().then(() => {
						reset()
					})
					return null
				}
				throw err
			}}
		>
			<div class="flex flex-1 flex-col">
				<VList
					class="flex-1"
					overscan={15}
					shift
					data={listData()}
					ref={setVlistRef}
					onScroll={async (offset) => {
						if (!vlistRef()) {
							return
						}

						setShouldStickToBottom(
							offset >= vlistRef()!.scrollSize - vlistRef()!.viewportSize - 120,
						)

						if (offset < 900) {
							// Only try to load if not exhausted
							if (
								paginatedMessages.status() === "CanLoadMore" ||
								paginatedMessages.status() === "LoadingMore"
							) {
								requestLoadMore()
							}
						}
					}}
				>
					{(item) => (
						<Show
							when={item.type === "message"}
							fallback={
								<MessageSkeleton isGroupStart={(item as ListItemSkeleton).isGroupStart} />
							}
						>
							{(() => {
								const messageItem = item as ListItemMessage

								return (
									<ChatMessage
										message={() => messageItem.data.message}
										isGroupStart={() => messageItem.data.isGroupStart}
										isGroupEnd={() => messageItem.data.isGroupEnd}
										isFirstNewMessage={() =>
											messageItem.data.message._id ===
											channelQuery.data?.currentUser?.lastSeenMessageId
										}
										serverId={props.serverId}
										isThread={() => false}
									/>
								)
							})()}
						</Show>
					)}
				</VList>

				<div class="mx-2 flex flex-col gap-1.5">
					<FloatingBar />
					<ChatTypingPresence />
				</div>
			</div>
		</ErrorBoundary>
	)
}
