import { LegendList } from "@legendapp/list"
import { useLiveInfiniteQuery } from "@tanstack/react-db"
import { useMemo } from "react"
import type { MessageWithPinned, ProcessedMessage } from "~/atoms/chat-query-atoms"
import { useChat } from "~/hooks/use-chat"
import { useScrollToBottom } from "~/hooks/use-scroll-to-bottom"
import { Route } from "~/routes/_app/$orgSlug/chat/$id"
import { MessageItem } from "./message-item"

export function MessageList() {
	const { channelId } = useChat()
	const { messagesInfiniteQuery } = Route.useLoaderData()

	const {
		data,
		pages: _pages,
		fetchNextPage,
		hasNextPage,
		isLoading,
	} = useLiveInfiniteQuery(messagesInfiniteQuery, {
		pageSize: 50,
		getNextPageParam: (lastPage) => (lastPage.length === 20 ? lastPage.length : undefined),
	})

	const messages = (data || []) as MessageWithPinned[]
	const isLoadingMessages = isLoading

	const processedMessages = useMemo(() => {
		const timeThreshold = 5 * 60 * 1000
		const chronologicalMessages = [...messages].reverse()

		return chronologicalMessages.map((message, index): ProcessedMessage => {
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

	// Use the scroll-to-bottom hook for robust scroll management
	const { scrollContainerRef } = useScrollToBottom({
		channelId,
		messages,
	})

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
			className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-2 transition-opacity duration-200"
			style={{
				overflowAnchor: "auto",
				scrollBehavior: "auto",
				opacity: isLoadingMessages && messages.length > 0 ? 0.7 : 1,
			}}
		>
			{/*
			TODO: Add pagination controls to load older messages
			Available: _fetchNextPage(), _hasNextPage
			Implementation options:
			  1. "Load More" button at top of message list (like Slack)
			  2. Auto-load when user scrolls near top (like Discord)
			  3. Intersection Observer on first message
			*/}

			{/* <LegendList<ProcessedMessage>
				alignItemsAtEnd
				maintainScrollAtEnd
				maintainVisibleContentPosition
				data={processedMessages}
				onStartReached={() => {
					if (hasNextPage) {
						fetchNextPage()
					}
				}}
				estimatedItemSize={80}
				keyExtractor={(it) => it?.message.id}
				initialScrollIndex={processedMessages.length - 1}
				renderItem={(props) => (
					<MessageItem
						message={props.item.message}
						isGroupStart={props.item.isGroupStart}
						isGroupEnd={props.item.isGroupEnd}
						isFirstNewMessage={props.item.isFirstNewMessage}
						isPinned={props.item.isPinned}
					/>
				)}
				style={{ flex: 1, minHeight: 0 }}
			/> */}

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
