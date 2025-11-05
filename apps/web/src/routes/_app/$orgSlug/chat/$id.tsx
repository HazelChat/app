import type { ChannelId, OrganizationId } from "@hazel/db/schema"
import { createLiveQueryCollection, eq } from "@tanstack/db"
import { createFileRoute } from "@tanstack/react-router"
import { ChatHeader } from "~/components/chat/chat-header"
import { MessageList } from "~/components/chat/message-list"
import { SlateMessageComposer } from "~/components/chat/slate-editor/slate-message-composer"
import { ThreadPanel } from "~/components/chat/thread-panel"
import { TypingIndicator } from "~/components/chat/typing-indicator"
import { messageCollection, pinnedMessageCollection, userCollection } from "~/db/collections"
import { useChat } from "~/hooks/use-chat"
import { useOrganization } from "~/hooks/use-organization"
import { ChatProvider } from "~/providers/chat-provider"

export const Route = createFileRoute("/_app/$orgSlug/chat/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const channelId = params.id as ChannelId

		// Create infinite query collection for messages
		// This replaces the simple messageCollection.preload() with pagination support
		const messagesInfiniteQuery = createLiveQueryCollection({
			query: (q) =>
				q
					.from({ message: messageCollection })
					.leftJoin({ pinned: pinnedMessageCollection }, ({ message, pinned }) =>
						eq(message.id, pinned.messageId),
					)
					.leftJoin({ author: userCollection }, ({ message, author }) =>
						eq(message.authorId, author.id),
					)
					.where(({ message }) => eq(message.channelId, channelId))
					.select(({ message, pinned, author }) => ({
						...message,
						pinnedMessage: pinned,
						author: author,
					}))
					.orderBy(({ message }) => message.createdAt, "desc")
					.limit(30)
					.offset(0),
		})

		// Preload the collection before navigation completes
		await messagesInfiniteQuery.preload()

		return {
			messagesInfiniteQuery,
		}
	},
})

function ChatContent() {
	const { activeThreadChannelId, activeThreadMessageId, closeThread, organizationId } = useChat()

	return (
		<div className="flex h-[100dvh] overflow-hidden">
			{/* Main Chat Area */}
			<div className="flex min-h-0 flex-1 flex-col">
				<ChatHeader />
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<MessageList />
				</div>
				<div className="flex-shrink-0 px-4 pt-2.5">
					<SlateMessageComposer />
					<TypingIndicator />
				</div>
			</div>

			{/* Thread Panel - Slide in from right */}
			{activeThreadChannelId && activeThreadMessageId && (
				<div className="slide-in-from-right w-[480px] animate-in duration-200">
					<ThreadPanel
						organizationId={organizationId}
						threadChannelId={activeThreadChannelId}
						originalMessageId={activeThreadMessageId}
						onClose={closeThread}
					/>
				</div>
			)}
		</div>
	)
}

function RouteComponent() {
	const { id } = Route.useParams()
	const { organizationId } = useOrganization()

	return (
		<ChatProvider channelId={id as ChannelId} organizationId={organizationId!}>
			<ChatContent />
		</ChatProvider>
	)
}
