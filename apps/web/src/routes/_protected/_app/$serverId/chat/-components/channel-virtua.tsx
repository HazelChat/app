import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import {
	type Accessor,
	ErrorBoundary,
	For,
	Show,
	createEffect,
	createMemo,
	createSignal,
	mapArray,
	on,
} from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { VList, type VListHandle } from "virtua/solid"
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

type ListItem = ListItemMessage | ListItemSkeleton

type ListItemMessage = {
	type: "message"
	data: { message: Message; isGroupStart: boolean; isGroupEnd: boolean }
}

type ListItemSkeleton = { type: "skeleton"; id: string; isGroupStart: boolean }

export function ChannelVirtua(props: {
	channelId: Accessor<Id<"channels">>
	serverId: Accessor<Id<"servers">>
	isThread: Accessor<boolean>
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

	createEffect(() => {
		setMessages(
			reconcile(messagesQuery.data?.pages.flatMap((page) => page.page).reverse() ?? [], { key: "_id" }),
		)
	})

	const processedMessages = createMemo(() => {
		const timeThreshold = 5 * 60 * 1000 // 5 minutes
		const sourceMessages = messages

		return sourceMessages.map((message, index) => {
			const prevMessage = index > 0 ? sourceMessages[index - 1] : null
			const nextMessage = index < sourceMessages.length - 1 ? sourceMessages[index + 1] : null

			const isGroupStart =
				!prevMessage ||
				message.authorId !== prevMessage.authorId ||
				message._creationTime - prevMessage._creationTime >= timeThreshold ||
				prevMessage.replyToMessageId != null

			const isGroupEnd =
				!nextMessage ||
				message.authorId !== nextMessage.authorId ||
				nextMessage._creationTime - message._creationTime >= timeThreshold

			return { message, isGroupStart, isGroupEnd }
		})
	})

	const [shouldStickToBottom, setShouldStickToBottom] = createSignal(true)
	const [vlistRef, setVlistRef] = createSignal<VListHandle | undefined>(undefined)

	createEffect(
		on(processedMessages, (items) => {
			if (shouldStickToBottom() && vlistRef() && items.length > 0) {
				// Defer scrolling to a microtask to allow virtua to process the new items
				queueMicrotask(() => {
					vlistRef()?.scrollToIndex(items.length - 1, { align: "end" })
				})
			}
		}),
	)

	return (
		<div class="flex flex-1 flex-col">
			<VList
				class="flex-1"
				// overscan={15}
				shift
				itemSize={70}
				data={processedMessages()}
				ref={setVlistRef}
				onScroll={async (offset) => {
					if (!vlistRef()) {
						return
					}

					setShouldStickToBottom(offset >= vlistRef()!.scrollSize - vlistRef()!.viewportSize - 120)

					if (offset < 900) {
						// Only try to load if not exhausted
						if (messagesQuery.hasNextPage && !messagesQuery.isFetching) {
							messagesQuery.fetchNextPage()
						}
					}
				}}
			>
				{(item) => (
					<ChatMessage
						message={() => item.message}
						isGroupStart={() => item.isGroupStart}
						isGroupEnd={() => item.isGroupEnd}
						isFirstNewMessage={() =>
							item.message._id === channelQuery.data?.currentUser?.lastSeenMessageId
						}
						serverId={props.serverId}
						isThread={props.isThread}
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
