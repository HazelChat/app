import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import {
	type Accessor,
	type Component,
	For,
	type JSX,
	Show,
	createEffect,
	createMemo,
	createSignal,
	mapArray,
	on,
	onCleanup,
	onMount,
} from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { ChatTypingPresence } from "~/components/chat-ui/chat-typing-presence"
import { FloatingBar } from "~/components/chat-ui/floating-bar"
import { ChatMessage } from "~/components/chat-ui/message/chat-message"
import { convexQuery } from "~/lib/convex-query"
import { useConvexInfiniteQuery } from "~/lib/convex-query/infinite"
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

const MessagePlaceholder = () => <div class="h-[42px]" />

export function ChannelWithoutVirtua(props: {
	channelId: Accessor<Id<"channels">>
	serverId: Accessor<Id<"servers">>
	isThread: boolean
}) {
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

	onMount(() => {
		setTimeout(() => {
			bottomRef?.scrollIntoView({ behavior: "smooth" })
		}, 1000)
	})

	createEffect(() => {
		setMessages(
			reconcile(messagesQuery.data?.pages.flatMap((page) => page.page).reverse() ?? [], { key: "_id" }),
		)
	})

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

	let bottomRef: HTMLDivElement | undefined
	let scrollContainerRef: HTMLDivElement | undefined
	const [shouldStickToBottom, setShouldStickToBottom] = createSignal(true)

	createEffect(
		on(processedMessages, () => {
			if (!shouldStickToBottom()) return

			if (bottomRef) {
				queueMicrotask(() => {
					if (bottomRef) {
						bottomRef.scrollIntoView({ behavior: "smooth" })
					}
				})
			}
		}),
	)

	const handleScroll = (e: Event) => {
		const target = e.currentTarget as HTMLDivElement
		if (!target) return

		setShouldStickToBottom(target.scrollHeight - target.scrollTop - target.clientHeight < 120)

		if (target.scrollTop < 900) {
			if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
				messagesQuery.fetchNextPage()
			}
		}
	}

	return (
		<div class="flex flex-1 flex-col overflow-hidden">
			<div class="flex-1 overflow-y-auto" ref={scrollContainerRef} onScroll={handleScroll}>
				<Show
					when={!messagesQuery.isLoading}
					fallback={
						<div class="flex flex-col justify-end p-4">
							{Array.from({ length: 10 }).map((_, i) => (
								<MessageSkeleton isGroupStart={i % 3 === 0} />
							))}
						</div>
					}
				>
					<div class="min-h-0 flex-1" />

					<Show when={messagesQuery.isFetchingNextPage}>
						<div class="flex justify-center p-4">
							<MessageSkeleton isGroupStart />
						</div>
					</Show>

					<For each={processedMessages()}>
						{(item) => (
							<LazyRender placeholder={<MessagePlaceholder />}>
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
							</LazyRender>
						)}
					</For>
				</Show>
				<div ref={bottomRef} class="h-[1px] flex-1" />
			</div>

			<div class="mx-2 flex flex-col gap-1.5">
				<FloatingBar />
				<ChatTypingPresence />
			</div>
		</div>
	)
}

interface LazyRenderProps {
	placeholder: JSX.Element
	children: JSX.Element
}

export const LazyRender: Component<LazyRenderProps> = (props) => {
	const [isVisible, setIsVisible] = createSignal(false)
	let elementRef: HTMLDivElement | undefined

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				// When the placeholder is visible, update the signal and stop observing
				if (entries[0].isIntersecting) {
					setIsVisible(true)
					observer.unobserve(elementRef!)
				}
			},
			{
				// You can tweak the rootMargin to load content slightly before it enters the screen
				rootMargin: "200px",
			},
		)

		if (elementRef) {
			observer.observe(elementRef)
		}

		onCleanup(() => observer.disconnect())
	})

	return (
		<div ref={elementRef}>
			<Show when={isVisible()} fallback={props.placeholder}>
				{props.children}
			</Show>
		</div>
	)
}
