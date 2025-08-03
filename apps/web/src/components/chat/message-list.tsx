import { useEffect, useMemo, useRef } from "react"
import { useChat } from "~/hooks/use-chat"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages, isLoadingNext, isLoadingPrev, loadNext, loadPrev } = useChat()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const lastMessageRef = useRef<HTMLDivElement>(null)
	const loadingRef = useRef(false)

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

	useEffect(() => {
		if (lastMessageRef.current) {
			lastMessageRef.current.scrollIntoView({ behavior: "smooth" })
		}
	}, [])

	const handleScroll = () => {
		const container = scrollContainerRef.current
		if (!container || loadingRef.current) return

		// Since we're using flex-col-reverse, the scroll logic is inverted
		// scrollTop === 0 means we're at the newest messages (bottom visually)
		// scrollTop at max means we're at the oldest messages (top visually)
		
		const isAtTop = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 10
		const isAtBottom = container.scrollTop < 10

		// Load older messages when scrolled to top (which is visually at the top)
		if (isAtTop && loadPrev && !isLoadingPrev) {
			loadingRef.current = true
			loadPrev()
			setTimeout(() => { loadingRef.current = false }, 1000)
		}

		// Load newer messages when scrolled to bottom (which is visually at the bottom)
		if (isAtBottom && loadNext && !isLoadingNext) {
			loadingRef.current = true
			loadNext()
			setTimeout(() => { loadingRef.current = false }, 1000)
		}
	}

	if (isLoadingMessages && messages.length === 0) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-muted-foreground text-sm">Loading messages...</div>
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
			onScroll={handleScroll}
			className="flex h-full flex-col-reverse overflow-y-auto py-2 pr-4"
		>
			{isLoadingNext && (
				<div className="py-2 text-center">
					<span className="text-muted-foreground text-xs">Loading newer messages...</span>
				</div>
			)}
			{Object.entries(groupedMessages)
				.reverse()
				.map(([date, dateMessages]) => (
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
									date ===
										Object.keys(groupedMessages)[Object.keys(groupedMessages).length - 1]
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
			{isLoadingPrev && (
				<div className="py-2 text-center">
					<span className="text-muted-foreground text-xs">Loading older messages...</span>
				</div>
			)}
		</div>
	)
}
