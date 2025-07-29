import { useEffect, useRef } from "react"
import { useChat } from "~/hooks/use-chat"
import { cn } from "~/lib/utils"
import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages, hasMoreMessages, loadMoreMessages } = useChat()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const lastMessageRef = useRef<HTMLDivElement>(null)

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (lastMessageRef.current) {
			lastMessageRef.current.scrollIntoView({ behavior: "smooth" })
		}
	}, [messages])

	// Handle scroll for pagination
	const handleScroll = () => {
		const container = scrollContainerRef.current
		if (!container || !hasMoreMessages) return

		// Load more when scrolled to top
		if (container.scrollTop === 0) {
			loadMoreMessages()
		}
	}

	if (isLoadingMessages) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-sm text-muted-foreground">Loading messages...</div>
			</div>
		)
	}

	if (messages.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">No messages yet</p>
					<p className="text-xs text-muted-foreground">Start the conversation!</p>
				</div>
			</div>
		)
	}

	// Group messages by date
	const groupedMessages = messages.reduce(
		(groups, message) => {
			const date = new Date(message._creationTime).toDateString()
			if (!groups[date]) {
				groups[date] = []
			}
			groups[date].push(message)
			return groups
		},
		{} as Record<string, typeof messages>,
	)

	return (
		<div
			ref={scrollContainerRef}
			onScroll={handleScroll}
			className="flex h-full flex-col-reverse overflow-y-auto px-4 py-2"
		>
			{Object.entries(groupedMessages)
				.reverse()
				.map(([date, dateMessages]) => (
					<div key={date}>
						<div className="sticky top-0 z-10 my-4 flex items-center justify-center">
							<span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
								{date}
							</span>
						</div>
						{dateMessages.map((message, index) => (
							<div
								key={message._id}
								ref={
									index === dateMessages.length - 1 &&
									date ===
										Object.keys(groupedMessages)[Object.keys(groupedMessages).length - 1]
										? lastMessageRef
										: undefined
								}
							>
								<MessageItem message={message} />
							</div>
						))}
					</div>
				))}
			{hasMoreMessages && (
				<div className="py-2 text-center">
					<button
						onClick={loadMoreMessages}
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						Load more messages
					</button>
				</div>
			)}
		</div>
	)
}
