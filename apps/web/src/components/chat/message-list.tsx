import { useEffect, useMemo, useRef } from "react"
import { VList, type VListHandle } from "virtua"
import { useChat } from "~/hooks/use-chat"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages, hasMoreMessages, loadMoreMessages, isLoadingMore, channelId } =
		useChat()
	const vlistRef = useRef<VListHandle>(null)
	const isInitialLoad = useRef(true)
	const shouldPreservePosition = useRef(false)

	// Reset initial load flag when channel changes
	useEffect(() => {
		isInitialLoad.current = true
	}, [channelId])

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
		if (isInitialLoad.current && messages.length > 0 && vlistRef.current) {
			// Scroll to the bottom (first item in reverse layout)
			setTimeout(() => {
				vlistRef.current?.scrollToIndex(0, { align: "end" })
			}, 100)
			isInitialLoad.current = false
		}
	}, [messages.length])

	// Reset shift flag after messages update
	useEffect(() => {
		if (shouldPreservePosition.current) {
			shouldPreservePosition.current = false
		}
	}, [messages])

	// Handle scroll events for loading more messages
	const handleScroll = () => {
		if (isLoadingMore || !hasMoreMessages || !vlistRef.current) return

		const scrollOffset = vlistRef.current.scrollOffset

		// In column-reverse layout, scrollOffset starts high and decreases as you scroll up
		// Load more when scrolled to the top (high scrollOffset value)
		if (scrollOffset > vlistRef.current.scrollSize - vlistRef.current.viewportSize - 100) {
			shouldPreservePosition.current = true
			loadMoreMessages()
		}
	}

	// Flatten messages with date separators for virtualization
	const flattenedItems = useMemo(() => {
		const items: Array<{ type: "date" | "message"; key: string; data: any }> = []

		Object.entries(groupedMessages).forEach(([date, dateMessages]) => {
			// Add date separator
			items.push({
				type: "date",
				key: `date-${date}`,
				data: { date },
			})

			// Add messages
			dateMessages.forEach((processedMessage) => {
				items.push({
					type: "message",
					key: processedMessage.message._id,
					data: processedMessage,
				})
			})
		})

		// Don't reverse - flex-direction handles the reversal
		return items
	}, [groupedMessages])

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

	return (
		<div className="flex h-full flex-col-reverse overflow-hidden">
			<VList
				ref={vlistRef}
				style={{
					height: "100%",
				}}
				reverse
				onScroll={handleScroll}
				shift={shouldPreservePosition.current}
				className="px-4 py-2"
			>
				{flattenedItems.map((item) => {
					if (item.type === "date") {
						return (
							<div
								key={item.key}
								className="sticky bottom-0 z-10 my-4 flex items-center justify-center"
							>
								<span className="rounded-full bg-muted px-3 py-1 font-mono text-secondary text-xs">
									{item.data.date}
								</span>
							</div>
						)
					}

					return (
						<MessageItem
							key={item.key}
							message={item.data.message}
							isGroupStart={item.data.isGroupStart}
							isGroupEnd={item.data.isGroupEnd}
							isFirstNewMessage={item.data.isFirstNewMessage}
							isPinned={item.data.isPinned}
						/>
					)
				})}

				{hasMoreMessages && (
					<div className="py-2 text-center">
						<button
							type="button"
							onClick={loadMoreMessages}
							disabled={isLoadingMore}
							className="text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
						>
							{isLoadingMore ? "Loading..." : "Load more messages"}
						</button>
					</div>
				)}
			</VList>
		</div>
	)
}
