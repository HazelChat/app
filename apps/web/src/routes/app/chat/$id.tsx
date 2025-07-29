import type { Id } from "@hazel/backend"
import { createFileRoute } from "@tanstack/react-router"
import { ChatHeader } from "~/components/chat/chat-header"
import { MessageList } from "~/components/chat/message-list"
import { TypingIndicator } from "~/components/chat/typing-indicator"
import { ChatProvider } from "~/providers/chat-provider"
import { MessageComposer } from "../../../components/chat/message-composer"

export const Route = createFileRoute("/app/chat/$id")({
	component: RouteComponent,
})

function RouteComponent() {
	const { id } = Route.useParams()

	return (
		<ChatProvider channelId={id as Id<"channels">}>
			<div className="flex h-full flex-col">
				<ChatHeader />
				<div className="flex-1 overflow-hidden">
					<MessageList />
				</div>
				<div className="mx-2 flex flex-col gap-1.5">
					<MessageComposer />
					<TypingIndicator />
				</div>
			</div>
		</ChatProvider>
	)
}
