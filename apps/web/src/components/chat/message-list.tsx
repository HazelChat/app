import { useEffect, useMemo, useRef, useCallback } from "react"
import { useChat } from "~/hooks/use-chat"
import { VList, type VListHandle } from "virtua"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages, hasMoreMessages, loadMoreMessages } = useChat()
	const vlistRef = useRef<VListHandle>(null)
	const lastScrollTop = useRef<number>(0)

	const processedMessages = useMemo(() => {
		const timeThreshold = 5 * 60 * 1000

		return messages.reverse().map((message, index) => {
			// Determine isGroupStart
			const prevMessage = index > 0 ? messages[index - 1] : null
			const isGroupStart =
				!prevMessage ||
				message.authorId !== prevMessage.authorId ||
				message._creationTime - prevMessage._creationTime > timeThreshold ||
				!!prevMessage.replyToMessageId

			// Determine isGroupEnd
			const nextMessage = index < messages.length - 1 ? messages[index + 1] : null
			const isGroupEnd =
				!nextMessage ||
				message.authorId !== nextMessage.authorId ||
				nextMessage._creationTime - message._creationTime > timeThreshold

			// TODO: Implement these when channel data is available
			const isFirstNewMessage = false // Will be based on lastSeenMessageId
			const isPinned = false // Will be based on channel.pinnedMessages

			return {
				message,
				isGroupStart,
				isGroupEnd,
				isFirstNewMessage,
				isPinned,
			}
		})
	}, [messages])

	// Group messages by date
	const groupedMessages = useMemo(() => {
		return processedMessages.reduce(
			(groups, processedMessage) => {
				const date = new Date(processedMessage.message._creationTime).toDateString()
				if (!groups[date]) {
					groups[date] = []
				}
				groups[date].push(processedMessage)
				return groups
			},
			{} as Record<string, typeof processedMessages>,
		)
	}, [processedMessages])

	// Scroll to bottom on initial load
	useEffect(() => {
		if (vlistRef.current && messages.length > 0) {
			vlistRef.current.scrollToIndex(messages.length - 1, { align: "end" })
		}
	}, [messages.length])

	// Handle scroll events for loading more messages
	const handleScroll = useCallback(() => {
		if (!vlistRef.current || isLoadingMessages) return

		const scrollTop = vlistRef.current.scrollOffset
		const scrollDirection = scrollTop < lastScrollTop.current ? "up" : "down"
		lastScrollTop.current = scrollTop

		// Load more messages when scrolling near the top
		if (scrollDirection === "up" && scrollTop < 100 && hasMoreMessages) {
			loadMoreMessages()
		}
	}, [hasMoreMessages, isLoadingMessages, loadMoreMessages])

	if (isLoadingMessages) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-muted-foreground text-sm">Loading messages...</div>
			</div>
		)
	}

	if (messages.length === 0) {
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

	// Flatten messages for virtual list
	const flattenedItems = useMemo(() => {
		const items: Array<{ type: "date" | "message" | "loadMore"; data: any }> = []

		// Add load more button at the top if there are more messages
		if (hasMoreMessages) {
			items.push({ type: "loadMore", data: null })
		}

		Object.entries(groupedMessages).forEach(([date, dateMessages]) => {
			items.push({ type: "date", data: date })
			dateMessages.forEach((processedMessage) => {
				items.push({ type: "message", data: processedMessage })
			})
		})

		return items
	}, [groupedMessages, hasMoreMessages])

	return (
		<VList ref={vlistRef} style={{ height: "100%", width: "100%" }} onScroll={handleScroll} overscan={5}>
			{flattenedItems.map((item, index) => {
				if (item.type === "loadMore") {
					return (
						<div key="loadMore" className="py-2 text-center">
							<button
								type="button"
								onClick={loadMoreMessages}
								disabled={isLoadingMessages}
								className="text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
							>
								{isLoadingMessages ? "Loading..." : "Load more messages"}
							</button>
						</div>
					)
				}

				if (item.type === "date") {
					return (
						<div
							key={`date-${item.data}`}
							className="sticky top-0 z-10 my-4 flex items-center justify-center"
						>
							<span className="rounded-full bg-muted px-3 py-1 font-mono text-secondary text-xs">
								{item.data}
							</span>
						</div>
					)
				}

				// type === "message"
				const processedMessage = item.data
				return (
					<div key={processedMessage.message._id} className="px-4">
						<MessageItem
							message={processedMessage.message}
							isGroupStart={processedMessage.isGroupStart}
							isGroupEnd={processedMessage.isGroupEnd}
							isFirstNewMessage={processedMessage.isFirstNewMessage}
							isPinned={processedMessage.isPinned}
						/>
					</div>
				)
			})}
		</VList>
	)
}
