import type { PinnedMessageId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { format } from "date-fns"
import { useRef, useState } from "react"
import { useHover } from "react-aria"
import { Button } from "react-aria-components"
import { toast } from "sonner"
import type { MessageWithPinned } from "~/atoms/chat-query-atoms"
import { messageCollection, messageReactionCollection } from "~/db/collections"
import { useChat } from "~/hooks/use-chat"
import { useAuth } from "~/lib/auth"
import { cx } from "~/utils/cx"
import { IconNotification } from "../application/notifications/notifications"
import { Badge } from "../base/badges/badges"
import IconPin from "../icons/icon-pin"
import { MarkdownReadonly } from "../markdown-readonly"
import { InlineThreadPreview } from "./inline-thread-preview"
import { MessageAttachments } from "./message-attachments"
import { MessageReplySection } from "./message-reply-section"
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
	const { addReaction, removeReaction } = useChat()

	const [isEditing, _setIsEditing] = useState(false)
	const messageRef = useRef<HTMLDivElement>(null)

	const { user: currentUser } = useAuth()

	const showAvatar = isGroupStart || !!message?.replyToMessageId
	const isRepliedTo = !!message?.replyToMessageId

	const { data: reactions } = useLiveQuery((q) =>
		q.from({ reactions: messageReactionCollection }).where((q) => eq(q.reactions.messageId, message?.id)),
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

		const existingReaction = reactions.find((r) => r.emoji === emoji && r.userId === currentUser?.id)
		if (existingReaction) {
			removeReaction(existingReaction.id)
		} else {
			addReaction(message.id, emoji)
		}
	}

	if (!message) return null

	return (
		<div
			{...hoverProps}
			ref={messageRef}
			id={`message-${message.id}`}
			className={cx(
				`group relative flex flex-col rounded-lg px-0.5 py-1 transition-colors duration-200 hover:bg-secondary`,
				isGroupStart ? "mt-2" : "",
				isGroupEnd ? "mb-2" : "",
				isFirstNewMessage
					? "rounded-l-none border-emerald-500 border-l-2 bg-emerald-500/20 hover:bg-emerald-500/15"
					: "",
				isPinned
					? "rounded-l-none border-amber-500 border-l-4 bg-amber-500/15 pl-2 shadow-sm hover:bg-amber-500/20"
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
							replyElement.classList.add("bg-quaternary/30")
							setTimeout(() => {
								replyElement.classList.remove("bg-quaternary/30")
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
					<div className="flex w-10 items-center justify-end pr-1 text-[10px] text-secondary leading-tight opacity-0 group-hover:opacity-100">
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
							{/* <TextEditor.Root
								content={message.jsonContent}
								editable={true}
								className="gap-0"
								onCreate={(editor) => {
									// Store editor reference for save/cancel buttons
									editorRef.current = editor

									// Add keyboard handler for Escape key
									const handleKeyDown = (event: Event) => {
										const keyboardEvent = event as KeyboardEvent
										if (keyboardEvent.key === "Escape") {
											setIsEditing(false)
											keyboardEvent.preventDefault()
										} else if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
											keyboardEvent.preventDefault()
											handleEdit(editor)
										}
									}

									const editorElement = document.querySelector('[data-slate-editor="true"]')
									if (editorElement) {
										editorElement.addEventListener("keydown", handleKeyDown)
										// Store cleanup function
										;(editor ).cleanup = () => {
											editorElement.removeEventListener("keydown", handleKeyDown)
										}
									}
								}}
								onUpdate={(editor) => {
									editorRef.current = editor
								}}
							>
								{(_editor) => (
									<>
										<div className="rounded border border-secondary p-2">
											<TextEditor.Content className="min-h-[2rem] text-sm" />
										</div>
										<div className="mt-2 flex gap-2">
											<StyledButton
												size="sm"
												color="primary"
												onClick={async () => {
													if (editorRef.current) {
														await handleEdit(editorRef.current)
													}
												}}
											>
												Save
											</StyledButton>
											<StyledButton
												size="sm"
												color="secondary"
												onClick={() => {
													setIsEditing(false)
													if (editorRef.current) {
														// Cleanup event listeners
														if ((editorRef.current ).cleanup) {
															;(editorRef.current ).cleanup()
														}
														editorRef.current.tf.reset()
														editorRef.current.children = message.jsonContent
													}
												}}
											>
												Cancel
											</StyledButton>
										</div>
									</>
								)}
							</TextEditor.Root> */}
						</div>
					) : (
						<MarkdownReadonly content={message.content}></MarkdownReadonly>
					)}

					{/* Attachments */}
					<MessageAttachments messageId={message.id} />

					{/* Reactions */}
					{reactions && reactions.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{Object.entries(
								reactions.reduce(
									(acc, reaction) => {
										if (!acc[reaction.emoji]) {
											acc[reaction.emoji] = {
												count: 0,
												users: [],
												hasReacted: false,
											}
										}
										acc[reaction.emoji]!.count++
										acc[reaction.emoji]!.users.push(reaction.userId)
										if (reaction.userId === currentUser?.id) {
											acc[reaction.emoji]!.hasReacted = true
										}
										return acc
									},
									{} as Record<
										string,
										{ count: number; users: string[]; hasReacted: boolean }
									>,
								),
							).map(([emoji, data]) => (
								<Button onPress={() => handleReaction(emoji)} key={emoji}>
									<Badge
										type="pill-color"
										color={data.hasReacted ? "brand" : "gray"}
										size="md"
									>
										{emoji} {data.count}
									</Badge>
								</Button>
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
		toast.custom((t) => (
			<IconNotification
				title="Sucessfully copied!"
				description="Message content has been copied to your clipboard."
				color="success"
				onClose={() => toast.dismiss(t)}
			/>
		))
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
			<span className="font-semibold">{user ? `${user.firstName} ${user.lastName}` : "Unknown"}</span>
			<span className="text-secondary text-xs">
				{format(message.createdAt, "HH:mm")}
				{isEdited && " (edited)"}
			</span>
			{isPinned && (
				<span className="flex items-center gap-1 text-amber-600 text-xs" title="Pinned message">
					<IconPin className="size-3" />
					<span>Pinned</span>
				</span>
			)}
		</div>
	)
}
