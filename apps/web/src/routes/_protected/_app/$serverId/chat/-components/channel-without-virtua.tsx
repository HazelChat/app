import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { useElementScrollRestoration } from "@tanstack/solid-router"
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	mapArray,
	on,
	onCleanup,
	onMount,
	Show,
} from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { ChatTypingPresence } from "~/components/chat-ui/chat-typing-presence"
import { FloatingBar } from "~/components/chat-ui/floating-bar"
import { ChatMessage } from "~/components/chat-ui/message/chat-message"
import { IconChevronDown } from "~/components/icons/chevron-down"
import { Button } from "~/components/ui/button"
import { convexQuery } from "~/lib/convex-query"
import { useConvexInfiniteQuery } from "~/lib/convex-query/infinite"
import { createNextPrevPaginatedQuery } from "~/lib/infinite/infinite-convex"
import type { Message } from "~/lib/types"
import { MessageOnScreen } from "./messages-onscreen"

const PAGE_SIZE = 35

// Skeleton component for loading messages
export const MessageSkeleton = (props: { isGroupStart: boolean }) => (
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

export function ChannelWithoutVirtua(props: {
	channelId: Accessor<Id<"channels">>
	serverId: Accessor<Id<"servers">>
	isThread: Accessor<boolean>
}) {
	const [isInitialRender, setIsInitialRender] = createSignal(true)

	const channelQuery = useQuery(() =>
		convexQuery(api.channels.getChannel, {
			channelId: props.channelId(),
			serverId: props.serverId(),
		}),
	)

	const messagesQuery = useConvexInfiniteQuery(
		api.messages.getMessages,
		{ channelId: props.channelId(), serverId: props.serverId() },
		{ numItems: PAGE_SIZE },
	)

	const [messages, setMessages] = createStore<Message[]>([])

	const [isFetchingUp, setIsFetchingUp] = createSignal(false)
	const [scrollSnapshot, setScrollSnapshot] = createSignal({ height: 0 })

	let bottomRef: HTMLDivElement | undefined
	let scrollContainerRef: HTMLDivElement | undefined
	const [shouldStickToBottom, setShouldStickToBottom] = createSignal(true)

	onMount(() => {
		setTimeout(() => {
			bottomRef?.scrollIntoView({ behavior: "auto" })
			setIsInitialRender(false)
		}, 0)
	})

	createEffect(
		on(
			() => messagesQuery.data,
			() => {
				if (!scrollContainerRef) return

				const wasFetchingUp = isFetchingUp()

				// Reconcile new data into our local store
				setMessages(
					reconcile(messagesQuery.data?.pages.flatMap((page) => page.page).reverse() ?? [], {
						key: "_id",
					}),
				)

				// If we just finished fetching older messages, preserve scroll
				if (wasFetchingUp) {
					// Wait for Solid to update the DOM (new messages rendered, skeletons removed)
					queueMicrotask(() => {
						if (scrollContainerRef) {
							const newHeight = scrollContainerRef.scrollHeight
							const oldHeight = scrollSnapshot().height
							scrollContainerRef.scrollTop += newHeight - oldHeight
						}
						setIsFetchingUp(false)
					})
				}
			},
		),
	)

	const processedMessages = mapArray(
		() => messages,
		(message, index) => {
			const timeThreshold = 5 * 60 * 1000

			const isGroupStart = createMemo(() => {
				const prevMessage = index() > 0 ? messages[index() - 1] : null
				if (!prevMessage) return true

				const timeDiff = message._creationTime - prevMessage._creationTime
				return !(
					message.authorId === prevMessage.authorId &&
					timeDiff < timeThreshold &&
					!prevMessage.replyToMessageId
				)
			})

			const isGroupEnd = createMemo(() => {
				const nextMessage = index() < messages.length - 1 ? messages[index() + 1] : null
				if (!nextMessage) return true

				const timeDiff = nextMessage._creationTime - message._creationTime
				return !(message.authorId === nextMessage.authorId && timeDiff < timeThreshold)
			})

			return { message, isGroupStart, isGroupEnd }
		},
	)

	createEffect(
		on(processedMessages, () => {
			if (!shouldStickToBottom() || isInitialRender() || isFetchingUp()) {
				return
			}

			if (bottomRef) {
				queueMicrotask(() => {
					bottomRef?.scrollIntoView({ behavior: "smooth" })
				})
			}
		}),
	)

	onMount(() => {
		if (scrollContainerRef) {
			scrollContainerRef.scrollTop = scrollContainerRef.scrollHeight
		}
	})

	const handleScroll = (e: Event) => {
		const target = e.currentTarget as HTMLDivElement
		if (!target || isInitialRender()) return

		const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120
		setShouldStickToBottom(isAtBottom && !messagesQuery.hasPreviousPage)

		// Trigger fetching older messages when scrolling to the top
		const isAtTop = target.scrollTop < 900
		if (isAtTop && messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && !isFetchingUp()) {
			// Set fetching state and capture current scroll height
			setIsFetchingUp(true)
			setScrollSnapshot({ height: target.scrollHeight })
			messagesQuery.fetchNextPage()
		}

		if (isAtBottom) {
			if (messagesQuery.hasPreviousPage && !messagesQuery.isFetchingPreviousPage) {
				messagesQuery.fetchPreviousPage()
			}
		}
	}

	return (
		<div class="relative flex flex-1 flex-col overflow-hidden">
			<Show when={processedMessages().length === 0 && messagesQuery.isSuccess}>
				<div class="flex size-full flex-col items-center justify-center p-4 sm:p-8">
					<div class="mask-radial-at-center mask-radial-from-black mask-radial-to-transparent relative aspect-square w-full max-w-sm">
						{/* Your masked image */}
						<img
							src="/images/squirrle_ocean.png"
							alt="squirrel"
							class="mask-size-[110%_90%] mask-linear-to-r mask-from-black mask-to-transparent mask-center mask-no-repeat mask-[url(/images/image-mask.png)] h-full w-full rounded-md bg-center bg-cover bg-no-repeat object-cover"
						/>
					</div>
					<p class="font-bold font-mono text-xl">Quiet as an ocean gazing squirrel...</p>
				</div>
			</Show>
			<div
				class="flex-1 overflow-y-auto"
				id="chat-scrollarea"
				ref={scrollContainerRef}
				onScroll={handleScroll}
			>
				<Show
					when={!messagesQuery.isLoading}
					fallback={
						<div class="flex flex-col-reverse p-4">
							{Array.from({ length: 15 }).map((_, i) => (
								<MessageSkeleton isGroupStart={i % 3 === 0} />
							))}
						</div>
					}
				>
					<div class="min-h-0 flex-1" />

					{/* Show placeholder skeletons while fetching older messages */}
					<Show when={isFetchingUp()}>
						<div class="flex flex-col">
							{Array.from({ length: PAGE_SIZE }).map((_, i) => (
								<MessageSkeleton isGroupStart={i % 4 === 0} />
							))}
						</div>
					</Show>

					<For each={processedMessages()}>
						{(item) => (
							<ChatMessage
								message={() => item.message}
								isGroupStart={item.isGroupStart}
								isGroupEnd={item.isGroupEnd}
								isFirstNewMessage={() =>
									item.message._id === channelQuery.data?.currentUser?.lastSeenMessageId
								}
								serverId={props.serverId}
								isThread={props.isThread}
							/>
						)}
					</For>
				</Show>
				<div ref={bottomRef} class="h-[1px] flex-1" />
			</div>

			<Show when={!shouldStickToBottom()}>
				<Button
					intent="secondary"
					size="icon"
					class="absolute right-4 bottom-28 z-10 size-7! border"
					onClick={() => bottomRef?.scrollIntoView({ behavior: "smooth" })}
				>
					<IconChevronDown class="size-4" />
				</Button>
			</Show>

			<div class="mx-2 flex flex-col gap-1.5">
				<FloatingBar />
				<ChatTypingPresence />
			</div>
		</div>
	)
}
