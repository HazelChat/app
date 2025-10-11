import { Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import {
	isAtBottomAtomFamily,
	messageCountAtomFamily,
	scrollContainerRefAtomFamily,
} from "~/atoms/chat-atoms"
import { messagesByChannelAtomFamily, processedMessagesByChannelAtomFamily } from "~/atoms/chat-query-atoms"
import { useChat } from "~/hooks/use-chat"

import { MessageItem } from "./message-item"

export function MessageList() {
	const { channelId } = useChat()
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	const messagesResult = useAtomValue(messagesByChannelAtomFamily(channelId))
	const messages = Result.getOrElse(messagesResult, () => [])
	const isLoadingMessages = Result.isInitial(messagesResult)

	const isAtBottom = useAtomValue(isAtBottomAtomFamily(channelId))
	const setIsAtBottom = useAtomSet(isAtBottomAtomFamily(channelId))
	const messageCount = useAtomValue(messageCountAtomFamily(channelId))
	const setMessageCount = useAtomSet(messageCountAtomFamily(channelId))
	const setScrollContainerRef = useAtomSet(scrollContainerRefAtomFamily(channelId))

	const processedMessages = useAtomValue(processedMessagesByChannelAtomFamily(channelId))

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

		const atBottom = checkIfAtBottom()
		setIsAtBottom(atBottom)
	}, [checkIfAtBottom, setIsAtBottom])

	// Store scroll container ref in atom for potential future use
	useEffect(() => {
		setScrollContainerRef(scrollContainerRef)
	}, [setScrollContainerRef])

	// Auto-scroll to bottom on initial load
	// biome-ignore lint/correctness/useExhaustiveDependencies: We only want to scroll on initial load
	useEffect(() => {
		if (scrollContainerRef.current && !isLoadingMessages && messages.length > 0) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
			setIsAtBottom(true)
		}
	}, [isLoadingMessages, setIsAtBottom])

	// Track message count changes and auto-scroll when at bottom
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		// Update message count in atom
		setMessageCount(messages.length)

		// Check if new messages were added
		const messageCountIncreased = messages.length > messageCount

		if (messageCountIncreased && isAtBottom) {
			// Use requestAnimationFrame to ensure DOM has updated before scrolling
			requestAnimationFrame(() => {
				if (container) {
					container.scrollTop = container.scrollHeight
					// Re-check if we're at bottom after scroll
					const atBottom = checkIfAtBottom()
					setIsAtBottom(atBottom)
				}
			})
		}
	}, [messages.length, messageCount, isAtBottom, setMessageCount, setIsAtBottom, checkIfAtBottom])

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
		</div>
	)
}
