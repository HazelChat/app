import type { ChannelId, OrganizationId } from "@hazel/db/schema"
import { createFileRoute } from "@tanstack/react-router"
import { ChatHeader } from "~/components/chat/chat-header"
import { MessageComposer } from "~/components/chat/message-composer"
import { MessageList } from "~/components/chat/message-list"
import { ThreadPanel } from "~/components/chat/thread-panel"
import { TypingIndicator } from "~/components/chat/typing-indicator"
import { useChat } from "~/hooks/use-chat"
import { useOrganization } from "~/hooks/use-organization"
import { ChatProvider } from "~/providers/chat-provider"

export const Route = createFileRoute("/_app/$orgSlug/chat/$id")({
	component: RouteComponent,
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
					<MessageComposer />
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
