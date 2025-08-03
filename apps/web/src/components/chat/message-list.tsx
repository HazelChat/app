import { useEffect, useMemo, useRef } from "react"
import { useChat } from "~/hooks/use-chat"
import { useIntersectionObserver } from "~/hooks/use-intersection-observer"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages, isLoadingNext, isLoadingPrev, loadNext, loadPrev } = useChat()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const prevScrollHeightRef = useRef<number>(0)
	const lastLoadTimeRef = useRef<number>(0)

	// Intersection observers for infinite scroll
	const [topSentinelRef, isTopVisible] = useIntersectionObserver({
		rootMargin: "100px",
		enabled: !isLoadingNext && !isLoadingMessages && !!loadNext,
	})
	const [bottomSentinelRef, isBottomVisible] = useIntersectionObserver({
		rootMargin: "100px",
		enabled: !isLoadingPrev && !isLoadingMessages && !!loadPrev,
	})

	const processedMessages = useMemo(() => {
		const timeThreshold = 5 * 60 * 1000
		// Messages are already in DESC order from backend, we want oldest first
		const chronologicalMessages = [...messages].reverse()

		return chronologicalMessages.map((message, index) => {
			// Determine isGroupStart
			const prevMessage = index > 0 ? chronologicalMessages[index - 1] : null
			const isGroupStart =
				!prevMessage ||
				message.authorId !== prevMessage.authorId ||
				message._creationTime - prevMessage._creationTime > timeThreshold ||
				!!prevMessage.replyToMessageId

			// Determine isGroupEnd
			const nextMessage =
				index < chronologicalMessages.length - 1 ? chronologicalMessages[index + 1] : null
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

	// Auto-scroll to bottom on initial load
	// biome-ignore lint/correctness/useExhaustiveDependencies: We only want to scroll on initial load>
	useEffect(() => {
		if (scrollContainerRef.current && !isLoadingMessages && messages.length > 0) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
		}
	}, [isLoadingMessages])

	// Load older messages when top sentinel is visible
	useEffect(() => {
		const now = Date.now()
		const timeSinceLastLoad = now - lastLoadTimeRef.current

		if (isTopVisible && loadNext && !isLoadingNext && !isLoadingMessages && timeSinceLastLoad > 500) {
			// Save current scroll position before loading
			if (scrollContainerRef.current) {
				prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight
			}
			lastLoadTimeRef.current = now
			loadNext()
		}
	}, [isTopVisible, loadNext, isLoadingNext, isLoadingMessages])

	// Load newer messages when bottom sentinel is visible
	useEffect(() => {
		const now = Date.now()
		const timeSinceLastLoad = now - lastLoadTimeRef.current

		if (isBottomVisible && loadPrev && !isLoadingPrev && !isLoadingMessages && timeSinceLastLoad > 500) {
			lastLoadTimeRef.current = now
			loadPrev()
		}
	}, [isBottomVisible, loadPrev, isLoadingPrev, isLoadingMessages])

	// Restore scroll position after loading older messages
	// biome-ignore lint/correctness/useExhaustiveDependencies: Save
	useEffect(() => {
		if (scrollContainerRef.current && prevScrollHeightRef.current > 0 && !isLoadingNext) {
			const newScrollHeight = scrollContainerRef.current.scrollHeight
			const scrollDiff = newScrollHeight - prevScrollHeightRef.current
			if (scrollDiff > 0) {
				scrollContainerRef.current.scrollTop = scrollDiff
				prevScrollHeightRef.current = 0
			}
		}
	}, [isLoadingNext, messages.length])

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
		<div ref={scrollContainerRef} className="flex h-full flex-col overflow-y-auto py-2 pr-4">
			{/* Top sentinel for loading older messages */}
			<div ref={topSentinelRef} className="h-1" />

			{isLoadingNext && (
				<div className="py-2 text-center">
					<span className="text-muted-foreground text-xs">Loading older messages...</span>
				</div>
			)}

			{Object.entries(groupedMessages).map(([date, dateMessages]) => (
				<div key={date}>
					<div className="sticky top-0 z-10 my-4 flex items-center justify-center">
						<span className="rounded-full bg-muted px-3 py-1 font-mono text-secondary text-xs">
							{date}
						</span>
					</div>
					{dateMessages.map((processedMessage) => (
						<div key={processedMessage.message._id}>
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
					<span className="text-muted-foreground text-xs">Loading newer messages...</span>
				</div>
			)}

			{/* Bottom sentinel for loading newer messages */}
			<div ref={bottomSentinelRef} className="h-1" />
		</div>
	)
}
