import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "~/hooks/use-chat"
// TODO: Re-enable when pagination is implemented
// import { useDebouncedIntersection } from "~/hooks/use-debounced-intersection"
// import { useLoadingState } from "~/hooks/use-loading-state"
// import { useScrollRestoration } from "~/hooks/use-scroll-restoration"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { messages, isLoadingMessages } = useChat()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	// TODO: Re-enable when pagination is implemented
	// const { saveScrollState, restoreScrollPosition } = useScrollRestoration()
	// const { canLoadTop, canLoadBottom, startLoadingTop, startLoadingBottom, finishLoading } =
	// 	useLoadingState()
	const [isAtBottom, setIsAtBottom] = useState(true)
	const prevMessageCountRef = useRef(messages.length)
	const isUserScrollingRef = useRef(false)
	const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
	// const loadingDirectionRef = useRef<"top" | "bottom" | null>(null)

	// TODO: Re-enable when pagination is implemented
	// const [topSentinelRef, isTopVisible] = useDebouncedIntersection({
	// 	rootMargin: "50px",
	// 	threshold: [0, 0.1, 0.5, 1],
	// 	enabled: canLoadTop && !isLoadingMessages,
	// 	debounceMs: 400,
	// })
	// const [bottomSentinelRef, isBottomVisible] = useDebouncedIntersection({
	// 	rootMargin: "50px",
	// 	threshold: [0, 0.1, 0.5, 1],
	// 	enabled: canLoadBottom && !isLoadingMessages,
	// 	debounceMs: 400,
	// })

	const processedMessages = useMemo(() => {
		const timeThreshold = 5 * 60 * 1000
		const chronologicalMessages = [...messages].reverse()

		return chronologicalMessages.map((message, index) => {
			// Determine isGroupStart
			const prevMessage = index > 0 ? chronologicalMessages[index - 1] : null
			const isGroupStart =
				!prevMessage ||
				message.authorId !== prevMessage.authorId ||
				message.createdAt.getTime() - prevMessage.createdAt.getTime() > timeThreshold ||
				!!prevMessage.replyToMessageId

			// Determine isGroupEnd
			const nextMessage =
				index < chronologicalMessages.length - 1 ? chronologicalMessages[index + 1] : null
			const isGroupEnd =
				!nextMessage ||
				message.authorId !== nextMessage.authorId ||
				nextMessage.createdAt.getTime() - message.createdAt.getTime() > timeThreshold

			// TODO: Implement these when channel data is available
			const isFirstNewMessage = false // Will be based on lastSeenMessageId
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

	// Group messages by date
	const groupedMessages = useMemo(() => {
		return processedMessages.reduce(
			(groups, processedMessage) => {
				const date = new Date(processedMessage.message.createdAt).toDateString()
				if (!groups[date]) {
					groups[date] = []
				}
				groups[date].push(processedMessage)
				return groups
			},
			{} as Record<string, typeof processedMessages>,
		)
	}, [processedMessages])

	// Check if user is at bottom of scroll container
	const checkIfAtBottom = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return false

		// Consider user at bottom if within 50px of the bottom
		const threshold = 50
		const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
		return isNearBottom
	}, [])

	// Handle scroll events to track if user is at bottom
	const handleScroll = useCallback(() => {
		const container = scrollContainerRef.current
		if (!container) return

		// Track that user is actively scrolling
		isUserScrollingRef.current = true
		clearTimeout(scrollTimeoutRef.current)
		scrollTimeoutRef.current = setTimeout(() => {
			isUserScrollingRef.current = false
		}, 150)

		setIsAtBottom(checkIfAtBottom())
	}, [checkIfAtBottom])

	// Auto-scroll to bottom on initial load
	// biome-ignore lint/correctness/useExhaustiveDependencies: We only want to scroll on initial load>
	useEffect(() => {
		if (scrollContainerRef.current && !isLoadingMessages && messages.length > 0) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
		}
	}, [isLoadingMessages])

	// Auto-scroll to bottom when new messages arrive if user was at bottom
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		// Check if new messages were added
		const messageCountIncreased = messages.length > prevMessageCountRef.current

		if (messageCountIncreased && isAtBottom) {
			// Scroll to bottom to show new messages
			container.scrollTop = container.scrollHeight
		}

		// Update previous message count
		prevMessageCountRef.current = messages.length
	}, [messages.length, isAtBottom])

	// TODO: Re-enable when pagination is implemented
	// // Load older messages when top sentinel is visible
	// useEffect(() => {
	// 	if (isTopVisible && loadNext && canLoadTop && !isLoadingMessages) {
	// 		// Try to start loading
	// 		if (startLoadingTop()) {
	// 			// Save current scroll position before loading
	// 			if (scrollContainerRef.current) {
	// 				saveScrollState(scrollContainerRef.current)
	// 				loadingDirectionRef.current = "top"
	// 			}
	// 			console.log("Loading older messages")
	// 			loadNext()
	// 		}
	// 	}
	// }, [isTopVisible, loadNext, canLoadTop, isLoadingMessages, saveScrollState, startLoadingTop])

	// // Load newer messages when bottom sentinel is visible
	// useEffect(() => {
	// 	if (isBottomVisible && loadPrev && canLoadBottom && !isLoadingMessages) {
	// 		// Try to start loading
	// 		if (startLoadingBottom()) {
	// 			// Save current scroll state before loading
	// 			if (scrollContainerRef.current) {
	// 				saveScrollState(scrollContainerRef.current)
	// 				loadingDirectionRef.current = "bottom"
	// 			}
	// 			console.log("Loading newer messages")
	// 			loadPrev()
	// 		}
	// 	}
	// }, [isBottomVisible, loadPrev, canLoadBottom, isLoadingMessages, saveScrollState, startLoadingBottom])

	// // Restore scroll position after loading messages
	// // biome-ignore lint/correctness/useExhaustiveDependencies: Complex scroll restoration
	// useEffect(() => {
	// 	const container = scrollContainerRef.current
	// 	if (!container || loadingDirectionRef.current === null) return

	// 	// Only restore if we're done loading in the expected direction
	// 	if (loadingDirectionRef.current === "top" && !isLoadingNext) {
	// 		restoreScrollPosition(container, "top")
	// 		loadingDirectionRef.current = null
	// 		finishLoading()
	// 	} else if (loadingDirectionRef.current === "bottom" && !isLoadingPrev) {
	// 		restoreScrollPosition(container, "bottom")
	// 		loadingDirectionRef.current = null
	// 		finishLoading()
	// 	}
	// }, [isLoadingNext, isLoadingPrev, messages.length, restoreScrollPosition, finishLoading])

	// Show skeleton loader only when no cached messages exist
	if (isLoadingMessages && messages.length === 0) {
		return (
			<div className="flex h-full flex-col gap-4 p-4">
				{/* Skeleton loader for messages */}
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
			onScroll={handleScroll}
			className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2 transition-opacity duration-200"
			style={{
				overflowAnchor: "auto",
				scrollBehavior: "auto",
				opacity: isLoadingMessages && messages.length > 0 ? 0.7 : 1,
			}}
		>
			{/* TODO: Re-enable when pagination is implemented */}
			{/* <div ref={topSentinelRef} className="h-1" /> */}

			{/* {isLoadingNext && (
				<div className="py-2 text-center">
					<span className="text-muted-foreground text-xs">Loading older messages...</span>
				</div>
			)} */}

			{Object.entries(groupedMessages).map(([date, dateMessages]) => (
				<div key={date}>
					<div className="sticky top-0 z-10 my-4 flex items-center justify-center">
						<span className="rounded-full bg-muted px-3 py-1 font-mono text-secondary text-xs">
							{date}
						</span>
					</div>
					{dateMessages.map((processedMessage) => (
						<div
							key={processedMessage.message.id}
							style={{ overflowAnchor: "none" }}
							data-message-id={processedMessage.message.id}
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

			{/* TODO: Re-enable when pagination is implemented */}
			{/* {isLoadingPrev && (
				<div className="py-2 text-center">
					<span className="text-muted-foreground text-xs">Loading newer messages...</span>
				</div>
			)} */}

			{/* <div ref={bottomSentinelRef} className="h-1" /> */}
		</div>
	)
}
