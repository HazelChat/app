import { createFileRoute, useParams } from "@tanstack/solid-router"
import { type Accessor, For, createMemo } from "solid-js"
import { ChatMessage } from "~/components/chat-ui/chat-message"
import { ChatTopbar } from "~/components/chat-ui/chat-topbar"
import { FloatingBar } from "~/components/chat-ui/floating-bar"
import { type Message, useChatMessages } from "~/lib/hooks/data/use-chat-messages"

export const Route = createFileRoute("/_app/$serverId/chat/$id")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = useParams({ from: "/_app/$serverId/chat/$id" })()

	const messagesEndRef: HTMLDivElement | undefined = undefined

	const messages = createMemo(() => useChatMessages(params.id))
	const processedMessages = createMemo(() => {
		const groupedMessages = messages()
			.messages()
			.reduce<Record<string, Message[]>>((groups, message) => {
				const date = new Date(message.createdAt!).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})

				if (!groups[date]) {
					groups[date] = [] as any
				}
				groups[date].push(message)
				return groups
			}, {})

		const sortedDates = Object.keys(groupedMessages).sort((a, b) => {
			return new Date(a).getTime() - new Date(b).getTime()
		})

		const timeThreshold = 5 * 60 * 1000 // 5 minutes

		const processedGroupedMessages: Record<
			string,
			Accessor<Array<{ message: Message; isGroupStart: boolean; isGroupEnd: boolean }>>
		> = {}

		for (const date of sortedDates) {
			const messagesForDate = groupedMessages[date].reverse() // Still reversed
			const processedMessages: Array<{ message: Message; isGroupStart: boolean; isGroupEnd: boolean }> = []

			for (let i = 0; i < messagesForDate.length; i++) {
				const currentMessage = messagesForDate[i]
				const prevMessage = i > 0 ? messagesForDate[i - 1] : null
				const nextMessage = i < messagesForDate.length - 1 ? messagesForDate[i + 1] : null

				// Determine if this message starts a new group
				let isGroupStart = true
				if (prevMessage) {
					const currentTime = new Date(currentMessage.createdAt!).getTime()
					const prevTime = new Date(prevMessage.createdAt!).getTime()
					const timeDiff = currentTime - prevTime
					if (currentMessage.authorId === prevMessage.authorId && timeDiff < timeThreshold) {
						isGroupStart = false
					}
				}

				// Determine if this message ends a group
				let isGroupEnd = true
				if (nextMessage) {
					const currentTime = new Date(currentMessage.createdAt!).getTime()
					const nextTime = new Date(nextMessage.createdAt!).getTime()
					const timeDiff = nextTime - currentTime
					if (currentMessage.authorId === nextMessage.authorId && timeDiff < timeThreshold) {
						isGroupEnd = false
					}
				}

				processedMessages.push({ message: currentMessage, isGroupStart, isGroupEnd })
			}
			processedGroupedMessages[date] = createMemo(() => processedMessages)
		}

		return { processedGroupedMessages: Object.entries(processedGroupedMessages) }
	})

	return (
		<div class="w-full">
			<ChatTopbar />
			<div class="flex-1 space-y-6 overflow-y-auto p-4 pl-0">
				<For each={processedMessages().processedGroupedMessages}>
					{([date, messages], dateIndex) => (
						<div class="flex flex-col">
							<div class="py-2 text-center text-muted-foreground text-sm">
								<span>{date}</span>
							</div>

							<For each={messages()}>
								{({ message, isGroupStart, isGroupEnd }, messageIndex) => {
									const isLastMessage =
										dateIndex() ===
											Object.keys(processedMessages().processedGroupedMessages).length - 1 &&
										messageIndex() === messages().length - 1

									return (
										<ChatMessage
											message={message}
											isLastMessage={isLastMessage}
											isGroupStart={isGroupStart}
											isGroupEnd={isGroupEnd}
											messagesEndRef={messagesEndRef}
										/>
									)
								}}
							</For>
						</div>
					)}
				</For>
			</div>
			<div class="mx-2 mb-6">
				<FloatingBar channelId={params.id} />
			</div>
		</div>
	)
}
