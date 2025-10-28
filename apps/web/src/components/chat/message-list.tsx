import { LegendList } from "@legendapp/list"
import { useLiveInfiniteQuery } from "@tanstack/react-db"
import { memo, useCallback, useMemo, useRef, useState } from "react"
import { useOverlayPosition } from "react-aria"
import { createPortal } from "react-dom"
import type { MessageWithPinned, ProcessedMessage } from "~/atoms/chat-query-atoms"
import { useChat } from "~/hooks/use-chat"
import { useScrollToBottom } from "~/hooks/use-scroll-to-bottom"
import { Route } from "~/routes/_app/$orgSlug/chat/$id"
import { MessageItem } from "./message-item"
import { MessageToolbar } from "./message-toolbar"

type MessageRowHeader = { id: string; type: "header"; date: string }
type MessageRowItem = { id: string; type: "row" } & ProcessedMessage
type MessageRow = MessageRowHeader | MessageRowItem

interface MessageVirtualListProps {
	messageRows: MessageRow[]
	stickyIndices: number[]
	onHoverChange: (messageId: string | null, ref: HTMLDivElement | null) => void
	hasNextPage: boolean
	fetchNextPage: () => void
}

const MessageVirtualList = memo(
	({ messageRows, stickyIndices, onHoverChange, hasNextPage, fetchNextPage }: MessageVirtualListProps) => {
		return (
			<LegendList<MessageRow>
				alignItemsAtEnd
				maintainScrollAtEnd
				maintainVisibleContentPosition
				data={messageRows}
				onStartReached={() => {
					if (hasNextPage) {
						fetchNextPage()
					}
				}}
				recycleItems
				estimatedItemSize={80}
				keyExtractor={(it) => it?.id}
				initialScrollIndex={messageRows.length - 1}
				stickyIndices={stickyIndices}
				renderItem={(props) =>
					props.item.type === "header" ? (
						<div
							className="sticky top-0 z-10 my-4 flex items-center justify-center"
							style={{ background: "var(--color-background)" }}
						>
							<span className="rounded-full bg-muted px-3 py-1 font-mono text-secondary text-xs">
								{props.item.date}
							</span>
						</div>
					) : (
						<MessageItem
							message={props.item.message}
							isGroupStart={props.item.isGroupStart}
							isGroupEnd={props.item.isGroupEnd}
							isFirstNewMessage={props.item.isFirstNewMessage}
							isPinned={props.item.isPinned}
							onHoverChange={onHoverChange}
						/>
					)
				}
				style={{ flex: 1, minHeight: 0 }}
			/>
		)
	},
)

MessageVirtualList.displayName = "MessageVirtualList"

export function MessageList() {
	const { channelId } = useChat()
	const { messagesInfiniteQuery } = Route.useLoaderData()

	const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
	const targetRef = useRef<HTMLDivElement | null>(null)
	const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false)
	const isToolbarHoveredRef = useRef(false)
	const overlayRef = useRef<HTMLDivElement>(null)
	const hideTimeoutRef = useRef<number | null>(null)

	const {
		data,
		pages: _pages,
		fetchNextPage,
		hasNextPage,
		isLoading,
	} = useLiveInfiniteQuery(messagesInfiniteQuery, {
		pageSize: 30,
		getNextPageParam: (lastPage) => (lastPage.length === 30 ? lastPage.length : undefined),
	})

	const messages = (data || []) as MessageWithPinned[]
	const isLoadingMessages = isLoading

	const hoveredMessage = useMemo(
		() => messages.find((m) => m.id === hoveredMessageId) || null,
		[messages, hoveredMessageId],
	)

	const { overlayProps } = useOverlayPosition({
		targetRef,
		overlayRef,
		placement: "top end",
		offset: -12,
		shouldFlip: true,
		isOpen: hoveredMessageId !== null,
	})

	const handleHoverChange = useCallback(
		(messageId: string | null, ref: HTMLDivElement | null) => {
			if (messageId) {
				if (hideTimeoutRef.current) {
					clearTimeout(hideTimeoutRef.current)
					hideTimeoutRef.current = null
				}
				setHoveredMessageId(messageId)
				targetRef.current = ref
			} else if (!isToolbarMenuOpen && !isToolbarHoveredRef.current) {
				hideTimeoutRef.current = window.setTimeout(() => {
					setHoveredMessageId(null)
					targetRef.current = null
					hideTimeoutRef.current = null
				}, 200)
			}
		},
		[isToolbarMenuOpen],
	)

	const processedMessages = useMemo(() => {
		const timeThreshold = 5 * 60 * 1000
		const chronologicalMessages = [...messages].reverse()

		return chronologicalMessages.map((message, index): ProcessedMessage => {
			const prevMessage = index > 0 ? chronologicalMessages[index - 1] : null
			const isGroupStart =
				!prevMessage ||
				message.authorId !== prevMessage.authorId ||
				message.createdAt.getTime() - prevMessage.createdAt.getTime() > timeThreshold ||
				!!prevMessage.replyToMessageId

			const nextMessage =
				index < chronologicalMessages.length - 1 ? chronologicalMessages[index + 1] : null
			const isGroupEnd =
				!nextMessage ||
				message.authorId !== nextMessage.authorId ||
				nextMessage.createdAt.getTime() - message.createdAt.getTime() > timeThreshold

			const isFirstNewMessage = false
			const isPinned = !!message.pinnedMessage?.id

			return {
				message,
				isGroupStart,
				isGroupEnd,
				isFirstNewMessage,
				isPinned,
			}
		})
	}, [messages])

	const { messageRows, stickyIndices } = useMemo(() => {
		const rows: MessageRow[] = []
		const sticky: number[] = []
		let idx = 0
		let lastDate = ""

		for (const processedMessage of processedMessages) {
			const date = new Date(processedMessage.message.createdAt).toDateString()
			if (date !== lastDate) {
				rows.push({ id: `header-${date}`, type: "header", date })
				sticky.push(idx)
				idx++
				lastDate = date
			}
			rows.push({
				id: processedMessage.message.id,
				type: "row",
				...processedMessage,
			})
			idx++
		}
		return { messageRows: rows, stickyIndices: sticky }
	}, [processedMessages])

	const { scrollContainerRef } = useScrollToBottom({
		channelId,
		messages,
	})

	if (isLoadingMessages && messages.length === 0) {
		return (
			<div className="flex h-full flex-col gap-4 p-4">
				{[...Array(5)].map((_, index) => (
					<div key={index} className="flex animate-pulse gap-3">
						<div className="size-10 rounded-full bg-muted" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-32 rounded bg-muted" />
							<div className="h-4 w-3/4 rounded bg-muted" />
							{index % 2 === 0 && <div className="h-4 w-1/2 rounded bg-muted" />}
						</div>
					</div>
				))}
			</div>
		)
	}

	if (!isLoadingMessages && messages.length === 0) {
		return (
			<div className="flex size-full flex-col items-center justify-center p-4 sm:p-8">
				<div className="mask-radial-at-center mask-radial-from-black mask-radial-to-transparent relative aspect-square w-full max-w-sm">
					<img
						src="/images/squirrle_ocean.png"
						alt="squirrel"
						className="mask-size-[110%_90%] mask-linear-to-r mask-from-black mask-to-transparent mask-center mask-no-repeat mask-[url(/images/image-mask.png)] h-full w-full rounded-md bg-center bg-cover bg-no-repeat object-cover"
					/>
				</div>
				<p className="font-bold font-mono text-xl">Quiet as an ocean gazing squirrel...</p>
			</div>
		)
	}

	return (
		<div
			ref={scrollContainerRef}
			className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2 transition-opacity duration-200"
			style={{
				overflowAnchor: "auto",
				scrollBehavior: "auto",
				opacity: isLoadingMessages && messages.length > 0 ? 0.7 : 1,
			}}
		>
			<MessageVirtualList
				messageRows={messageRows}
				stickyIndices={stickyIndices}
				onHoverChange={handleHoverChange}
				hasNextPage={hasNextPage}
				fetchNextPage={fetchNextPage}
			/>

			{(hoveredMessageId || isToolbarMenuOpen) &&
				hoveredMessage &&
				createPortal(
					<div
						ref={overlayRef}
						{...overlayProps}
						style={{ ...overlayProps.style, zIndex: 50 }}
						role="group"
						onMouseEnter={() => {
							isToolbarHoveredRef.current = true
						}}
						onMouseLeave={() => {
							isToolbarHoveredRef.current = false
						}}
					>
						<MessageToolbar message={hoveredMessage} onMenuOpenChange={setIsToolbarMenuOpen} />
					</div>,
					document.body,
				)}
		</div>
	)
}
