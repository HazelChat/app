import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { X } from "@untitledui/icons"
import { format } from "date-fns"
import { Button } from "react-aria-components"
import { ChatProvider } from "~/providers/chat-provider"
import { Avatar } from "../base/avatar/avatar"
import { MarkdownReadonly } from "../markdown-readonly"
import { MessageComposer } from "./message-composer"
import { MessageList } from "./message-list"
import { TypingIndicator } from "./typing-indicator"

interface ThreadPanelProps {
	threadChannelId: Id<"channels">
	originalMessageId: Id<"messages">
	organizationId: Id<"organizations">
	onClose: () => void
}

function ThreadContent({ threadChannelId, originalMessageId, organizationId, onClose }: ThreadPanelProps) {
	// Fetch the original message (parent message)
	const { data: originalMessage } = useQuery(
		convexQuery(api.messages.getMessage, {
			organizationId,
			channelId: threadChannelId,
			id: originalMessageId,
		}),
	)

	// Fetch thread channel info
	const { data: threadChannel } = useQuery(
		convexQuery(api.channels.getChannel, {
			organizationId,
			channelId: threadChannelId,
		}),
	)

	return (
		<div className="flex h-full flex-col border-secondary border-l bg-primary">
			{/* Thread Header */}
			<div className="flex items-center justify-between border-secondary border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold">Thread</h2>
					{threadChannel && (
						<span className="text-sm text-tertiary">
							{threadChannel.members?.length || 0} participants
						</span>
					)}
				</div>
				<Button onPress={onClose} className="rounded p-1 hover:bg-tertiary" aria-label="Close thread">
					<X className="size-4" />
				</Button>
			</div>

			{/* Original Message */}
			{originalMessage && (
				<div className="border-secondary border-b bg-secondary px-4 py-3">
					<div className="flex gap-3">
						<Avatar
							size="sm"
							alt={`${originalMessage.author.firstName} ${originalMessage.author.lastName}`}
							src={originalMessage.author.avatarUrl}
						/>
						<div className="min-w-0 flex-1">
							<div className="flex items-baseline gap-2">
								<span className="font-medium text-sm">
									{originalMessage.author.firstName} {originalMessage.author.lastName}
								</span>
								<span className="text-tertiary text-xs">
									{format(originalMessage._creationTime, "MMM d, HH:mm")}
								</span>
							</div>
							<div className="mt-1">
								<MarkdownReadonly value={originalMessage.jsonContent}></MarkdownReadonly>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Thread Messages - Using MessageList from ChatProvider */}
			<div className="flex-1 overflow-hidden">
				<MessageList />
			</div>

			{/* Thread Composer */}
			<div className="border-secondary border-t px-4 py-3">
				<MessageComposer placeholder="Reply in thread..." />
				<TypingIndicator />
			</div>
		</div>
	)
}

export function ThreadPanel({
	threadChannelId,
	originalMessageId,
	organizationId,
	onClose,
}: ThreadPanelProps) {
	return (
		<ChatProvider channelId={threadChannelId} organizationId={organizationId}>
			<ThreadContent
				threadChannelId={threadChannelId}
				originalMessageId={originalMessageId}
				organizationId={organizationId}
				onClose={onClose}
			/>
		</ChatProvider>
	)
}
