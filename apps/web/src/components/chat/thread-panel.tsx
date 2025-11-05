import type { ChannelId, MessageId, OrganizationId } from "@hazel/db/schema"
import { format } from "date-fns"
import { useMessage } from "~/db/hooks"
import { ChatProvider } from "~/providers/chat-provider"
import IconClose from "../icons/icon-close"
import { Avatar } from "../ui/avatar"
import { Button } from "../ui/button"
import { MessageList } from "./message-list"
import { SlateMessageComposer } from "./slate-editor/slate-message-composer"
import { SlateMessageViewer } from "./slate-editor/slate-message-viewer"
import { TypingIndicator } from "./typing-indicator"

interface ThreadPanelProps {
	threadChannelId: ChannelId
	originalMessageId: MessageId
	organizationId: OrganizationId
	onClose: () => void
}

function ThreadContent({ threadChannelId, originalMessageId, onClose }: ThreadPanelProps) {
	const { data: originalMessage } = useMessage(originalMessageId)

	return (
		<div className="flex h-full flex-col border-border border-l bg-bg">
			{/* Thread Header */}
			<div className="flex items-center justify-between border-border border-b bg-bg px-4 py-3">
				<div className="flex items-center gap-2">
					<h2 className="font-semibold text-fg">Thread</h2>
				</div>
				<Button
					intent="plain"
					size="sq-sm"
					onPress={onClose}
					aria-label="Close thread"
					className="rounded p-1 hover:bg-secondary"
				>
					<IconClose data-slot="icon" className="size-4" />
				</Button>
			</div>

			{/* Original Message */}
			{originalMessage && (
				<div className="border-border border-b bg-secondary px-4 py-3">
					<div className="flex gap-3">
						<Avatar
							src={originalMessage.author.avatarUrl}
							initials={`${originalMessage.author.firstName} ${originalMessage.author.lastName}`}
							className="size-9"
						/>
						<div className="min-w-0 flex-1">
							<div className="flex items-baseline gap-2">
								<span className="font-medium text-fg text-sm">
									{originalMessage.author.firstName} {originalMessage.author.lastName}
								</span>
								<span className="text-muted-fg text-xs">
									{format(originalMessage.createdAt, "MMM d, HH:mm")}
								</span>
							</div>
							<div className="mt-1">
								<SlateMessageViewer content={originalMessage.content} />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Thread Messages - Using MessageList from ChatProvider */}
			<div className="flex-1 overflow-hidden bg-bg">
				<MessageList />
			</div>

			{/* Thread Composer */}
			<div className="border-border border-t bg-bg px-4 py-3">
				<SlateMessageComposer placeholder="Reply in thread..." />
				<TypingIndicator />
			</div>
		</div>
	)
}

export function ThreadPanel({
	threadChannelId,
	originalMessageId,
	onClose,
	organizationId,
}: ThreadPanelProps) {
	return (
		<ChatProvider channelId={threadChannelId} organizationId={organizationId}>
			<ThreadContent
				organizationId={organizationId}
				threadChannelId={threadChannelId}
				originalMessageId={originalMessageId}
				onClose={onClose}
			/>
		</ChatProvider>
	)
}
