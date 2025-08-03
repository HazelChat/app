import { useEffect, useMemo, useRef } from "react"
import { useChat } from "~/hooks/use-chat"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages, hasMoreMessages, loadMoreMessages, isLoadingMore } = useChat()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const lastMessageRef = useRef<HTMLDivElement>(null)

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
		if (lastMessageRef.current && messages.length > 0) {
			lastMessageRef.current.scrollIntoView({ behavior: "smooth" })
		}
	}, [messages.length])

	// Handle scroll events for loading more messages
	const handleScroll = () => {
		const container = scrollContainerRef.current
		if (!container || isLoadingMore || !hasMoreMessages) return

		// Load more when scrolled near the top
		if (container.scrollTop < 100) {
			loadMoreMessages()
		}
	}

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
		<div
			ref={scrollContainerRef}
			onScroll={handleScroll}
			className="flex h-full flex-col overflow-y-auto py-2 px-4"
		>
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

			{Object.entries(groupedMessages).map(([date, dateMessages]) => (
				<div key={date}>
					<div className="sticky top-0 z-10 my-4 flex items-center justify-center">
						<span className="rounded-full bg-muted px-3 py-1 font-mono text-secondary text-xs">
							{date}
						</span>
					</div>
					{dateMessages.map((processedMessage, index) => (
						<div
							key={processedMessage.message._id}
							ref={
								index === dateMessages.length - 1 &&
								date === Object.keys(groupedMessages)[Object.keys(groupedMessages).length - 1]
									? lastMessageRef
									: undefined
							}
						>
							<MessageItem
								message={processedMessage.message}
								isGroupStart={processedMessage.isGroupStart}
								isGroupEnd={processedMessage.isGroupEnd}
								isFirstNewMessage={processedMessage.isFirstNewMessage}
								isPinned={processedMessage.isPinned}
							/>
						</div>
					))}
				</div>
			))}
		</div>
	)
}
