import { useAtomValue } from "@effect-atom/atom-react"
import type { PinnedMessageId } from "@hazel/db/schema"
import { format } from "date-fns"
import { useRef, useState } from "react"
import { useHover } from "react-aria"
import { Button } from "react-aria-components"
import { toast } from "sonner"
import type { MessageWithPinned } from "~/atoms/chat-query-atoms"
import { processedReactionsAtomFamily } from "~/atoms/message-atoms"
import IconPin from "~/components/icons/icon-pin"
import { extractUrls, LinkPreview } from "~/components/link-preview"
import { messageCollection } from "~/db/collections"
import { useChat } from "~/hooks/use-chat"
import { useEmojiStats } from "~/hooks/use-emoji-stats"
import { useAuth } from "~/lib/auth"
import { cn } from "~/lib/utils"
import { InlineThreadPreview } from "./inline-thread-preview"
import { MessageAttachments } from "./message-attachments"
import { MessageReplySection } from "./message-reply-section"
import { SlateMessageViewer } from "./slate-editor/slate-message-viewer"
import { UserProfilePopover } from "./user-profile-popover"

interface MessageItemProps {
	message: MessageWithPinned
	isGroupStart?: boolean
	isGroupEnd?: boolean
	isFirstNewMessage?: boolean
	isPinned?: boolean
	onHoverChange?: (messageId: string | null, ref: HTMLDivElement | null) => void
}

export function MessageItem({
	message,
	isGroupStart = false,
	isGroupEnd = false,
	isFirstNewMessage = false,
	isPinned = false,
	onHoverChange,
}: MessageItemProps) {
	const { addReaction } = useChat()
	const { trackEmojiUsage } = useEmojiStats()

	const [isEditing, _setIsEditing] = useState(false)
	const messageRef = useRef<HTMLDivElement>(null)

	const { user: currentUser } = useAuth()

	const showAvatar = isGroupStart || !!message?.replyToMessageId
	const isRepliedTo = !!message?.replyToMessageId

	// Use atom for reactions - automatically deduplicated and memoized
	const aggregatedReactions = useAtomValue(
		processedReactionsAtomFamily({ messageId: message.id, currentUserId: currentUser?.id || "" }),
	)

	const { hoverProps } = useHover({
		onHoverStart: () => {
			onHoverChange?.(message.id, messageRef.current)
		},
		onHoverEnd: () => {
			onHoverChange?.(null, null)
		},
	})

	const handleReaction = (emoji: string) => {
		if (!message) return
		trackEmojiUsage(emoji)
		// addReaction now handles the toggle logic internally
		addReaction(message.id, emoji)
	}

	if (!message) return null

	return (
		<div
			{...hoverProps}
			ref={messageRef}
			id={`message-${message.id}`}
			className={cn(
				"group relative flex flex-col rounded-lg px-0.5 py-1 transition-colors duration-200 hover:bg-secondary",
				isGroupStart ? "mt-2" : "",
				isGroupEnd ? "mb-2" : "",
				isFirstNewMessage
					? "rounded-l-none border-success border-l-2 bg-success/10 hover:bg-success/5"
					: "",
				isPinned
					? "rounded-l-none border-warning border-l-4 bg-warning/10 pl-2 shadow-sm hover:bg-warning/15"
					: "",
			)}
			data-id={message.id}
		>
			{/* Reply Section */}
			{isRepliedTo && message.replyToMessageId && (
				<MessageReplySection
					replyToMessageId={message.replyToMessageId}
					onClick={() => {
						const replyElement = document.getElementById(`message-${message.replyToMessageId}`)
						if (replyElement) {
							replyElement.scrollIntoView({ behavior: "smooth", block: "center" })
							// Add a highlight effect
							replyElement.classList.add("bg-secondary/30")
							setTimeout(() => {
								replyElement.classList.remove("bg-secondary/30")
							}, 2000)
						}
					}}
				/>
			)}

			{/* Main Content Row */}
			<div className="flex gap-4">
				{showAvatar ? (
					<UserProfilePopover userId={message.authorId} />
				) : (
					<div className="flex w-[40px] items-center justify-end pr-1 text-[10px] text-muted-fg leading-tight opacity-0 group-hover:opacity-100">
						{format(message.createdAt, "HH:mm")}
					</div>
				)}

				{/* Content Section */}
				<div className="min-w-0 flex-1">
					{/* Author header (only when showing avatar) */}
					{showAvatar && <MessageAuthorHeader message={message} isPinned={isPinned} />}

					{/* Message Content */}
					{isEditing ? (
						<div className="mt-1">
							{/* Edit mode - simplified for now */}
							<div className="rounded-lg border border-border bg-bg p-2">
								<textarea
									className="w-full resize-none border-0 bg-transparent text-base text-fg outline-none"
									defaultValue={message.content}
								/>
							</div>
						</div>
					) : (
						<>
							<SlateMessageViewer content={message.content} />
							{/* Link Preview */}
							{(() => {
								const urls = extractUrls(message.content)
								const lastUrl = urls[urls.length - 1]
								return lastUrl ? <LinkPreview url={lastUrl} /> : null
							})()}
						</>
					)}

					{/* Attachments */}
					<MessageAttachments messageId={message.id} />

					{/* Reactions */}
					{aggregatedReactions.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{aggregatedReactions.map(([emoji, data]) => (
								<button
									type="button"
									onClick={() => handleReaction(emoji)}
									key={emoji}
									className={cn(
										"inline-flex size-max cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium text-sm ring ring-inset transition-colors",
										data.hasReacted
											? "bg-primary/10 text-primary ring-primary/20 hover:bg-primary/20"
											: "bg-secondary text-fg ring-border hover:bg-secondary/80",
									)}
								>
									{emoji} {data.count}
								</button>
							))}
						</div>
					)}

					{/* Thread Preview */}
					{message.threadChannelId && (
						<InlineThreadPreview
							threadChannelId={message.threadChannelId}
							messageId={message.id}
						/>
					)}
				</div>
			</div>
		</div>
	)
}

// Export handlers for use by MessageList's shared toolbar
export function useMessageHandlers(message: MessageWithPinned | null) {
	const { setReplyToMessageId, pinMessage, unpinMessage, createThread } = useChat()
	const { user: currentUser } = useAuth()

	const handleDelete = () => {
		if (!message) return
		messageCollection.delete(message.id)
	}

	const handleCopy = () => {
		if (!message) return

		navigator.clipboard.writeText(message.content)
		toast.success("Copied!", {
			description: "Message content has been copied to your clipboard.",
		})
	}

	const handleReply = () => {
		if (!message) return
		setReplyToMessageId(message.id)
	}

	const handleThread = () => {
		if (!message) return
		createThread(message.id, message.threadChannelId)
	}

	const handlePin = (isPinned: boolean, pinnedMessageId?: string) => {
		if (!message) return
		if (isPinned && pinnedMessageId) {
			unpinMessage(pinnedMessageId as PinnedMessageId)
		} else if (!isPinned) {
			pinMessage(message.id)
		}
	}

	return {
		isOwnMessage: currentUser?.id === message?.authorId,
		handleDelete,
		handleCopy,
		handleReply,
		handleThread,
		handlePin,
	}
}

export const MessageAuthorHeader = ({
	message,
	isPinned = false,
}: {
	message: MessageWithPinned
	isPinned?: boolean
}) => {
	// Author is now directly attached to the message via leftJoin
	const user = message.author

	const isEdited = message.updatedAt && message.updatedAt.getTime() > message.createdAt.getTime()

	if (!user) return null

	return (
		<div className="flex items-baseline gap-2">
			<span className="font-semibold text-fg">
				{user ? `${user.firstName} ${user.lastName}` : "Unknown"}
			</span>
			<span className="text-muted-fg text-xs">
				{format(message.createdAt, "HH:mm")}
				{isEdited && " (edited)"}
			</span>
			{isPinned && (
				<span className="flex items-center gap-1 text-warning text-xs" title="Pinned message">
					<IconPin className="size-3" />
					<span>Pinned</span>
				</span>
			)}
		</div>
	)
}
