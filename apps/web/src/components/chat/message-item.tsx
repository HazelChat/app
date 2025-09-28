import type { Message } from "@hazel/db/models"
import type { ChannelId, MessageId } from "@hazel/db/schema"
import { count, eq, useLiveQuery } from "@tanstack/react-db"
import { format } from "date-fns"
import { useRef, useState } from "react"
import { Button } from "react-aria-components"
import { toast } from "sonner"
import {
	messageCollection,
	messageReactionCollection,
	pinnedMessageCollection,
	userCollection,
} from "~/db/collections"
import { useChat } from "~/hooks/use-chat"
import { useAuth } from "~/providers/auth-provider"
import { cx } from "~/utils/cx"
import { IconNotification } from "../application/notifications/notifications"
import { Badge } from "../base/badges/badges"
import { MarkdownReadonly } from "../markdown-readonly"
import { IconThread } from "../temp-icons/thread"
import { MessageAttachments } from "./message-attachments"
import { MessageReplySection } from "./message-reply-section"
import { MessageToolbar } from "./message-toolbar"
import { UserProfilePopover } from "./user-profile-popover"

interface MessageItemProps {
	message: typeof Message.Model.Type
	isGroupStart?: boolean
	isGroupEnd?: boolean
	isFirstNewMessage?: boolean
	isPinned?: boolean
}

export function MessageItem({
	message,
	isGroupStart = false,
	isGroupEnd = false,
	isFirstNewMessage = false,
}: MessageItemProps) {
	const {
		addReaction,
		removeReaction,
		setReplyToMessageId,
		pinMessage,
		unpinMessage,
		channelId,
		createThread,
	} = useChat()

	const [isEditing, setIsEditing] = useState(false)
	const [hasBeenHovered, setHasBeenHovered] = useState(false)
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

	const { user: currentUser } = useAuth()
	const isOwnMessage = currentUser?.id === message?.authorId

	const showAvatar = isGroupStart || !!message?.replyToMessageId
	const isRepliedTo = !!message?.replyToMessageId

	// Query for pinned messages in current channel
	const { data: pinnedMessages } = useLiveQuery(
		(q) =>
			q
				.from({ pinned: pinnedMessageCollection })
				.where(({ pinned }) => eq(pinned.channelId, channelId))
				.select(({ pinned }) => pinned),
		[channelId],
	)

	const isMessagePinned = pinnedMessages?.some((p) => p.messageId === message?.id) || false

	const { data: reactions } = useLiveQuery((q) =>
		q.from({ reactions: messageReactionCollection }).where((q) => eq(q.reactions.messageId, message?.id)),
	)

	const handleReaction = (emoji: string) => {
		if (!message) return

		const existingReaction = reactions.find((r) => r.emoji === emoji && r.userId === currentUser?.id)
		if (existingReaction) {
			removeReaction(existingReaction.id)
		} else {
			addReaction(message.id, emoji)
		}
	}

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

	const handleMouseEnter = () => {
		// Clear any existing timeout
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current)
		}
		// Set a small delay to prevent toolbar flash during quick scrolling
		hoverTimeoutRef.current = setTimeout(() => {
			setHasBeenHovered(true)
		}, 100)
	}

	const handleMouseLeave = () => {
		// Clear the timeout if mouse leaves before toolbar shows
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current)
		}
	}

	if (!message) return null

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: needed for hover interaction */}
			<div
				id={`message-${message.id}`}
				className={cx(
					`group relative flex flex-col rounded-lg py-1 transition-colors md:px-4 md:py-2 md:hover:bg-secondary`,
					isGroupStart ? "mt-2" : "",
					isGroupEnd ? "mb-2" : "",
					isFirstNewMessage
						? "border-emerald-500 border-l-2 bg-emerald-500/20 hover:bg-emerald-500/15"
						: "",
					isMessagePinned
						? "border-amber-500 border-l-2 bg-amber-500/10 hover:bg-amber-500/15"
						: "",
				)}
				data-id={message.id}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				{/* Reply Section */}
				{isRepliedTo && message.replyToMessageId && (
					<MessageReplySection
						replyToMessageId={message.replyToMessageId}
						onClick={() => {
							const replyElement = document.getElementById(
								`message-${message.replyToMessageId}`,
							)
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
						{showAvatar && <MessageAuthorHeader message={message} />}

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

						{/* Thread Button */}
						{message.threadChannelId && (
							<ThreadMessageIndicator
								threadChannelId={message.threadChannelId}
								messageId={message.id}
							/>
						)}
					</div>
				</div>

				{/* Message Toolbar - Only render when hovered or menu is open to improve performance */}
				{(hasBeenHovered || isMenuOpen) && (
					<MessageToolbar
						isOwnMessage={isOwnMessage}
						isPinned={isMessagePinned}
						onReaction={handleReaction}
						onEdit={() => setIsEditing(true)}
						onDelete={handleDelete}
						onCopy={handleCopy}
						onReply={() => {
							setReplyToMessageId(message.id)
						}}
						onThread={() => {
							createThread(message.id)
						}}
						onForward={() => {
							// TODO: Implement forward message
							console.log("Forward message")
						}}
						onMarkUnread={() => {
							// TODO: Implement mark as unread
							console.log("Mark as unread")
						}}
						onPin={() => {
							if (isMessagePinned) {
								unpinMessage(message.id)
							} else {
								pinMessage(message.id)
							}
						}}
						onReport={() => {
							// TODO: Implement report message
							console.log("Report message")
						}}
						onViewDetails={() => {
							// TODO: Implement view details
							console.log("View details")
						}}
						onMenuOpenChange={setIsMenuOpen}
					/>
				)}
			</div>
		</>
	)
}

const ThreadMessageIndicator = ({
	threadChannelId,
	messageId,
}: {
	threadChannelId: ChannelId
	messageId: MessageId
}) => {
	const { openThread } = useChat()

	const { data } = useLiveQuery((q) =>
		q
			.from({ message: messageCollection })
			.where(({ message }) => eq(message.channelId, threadChannelId))
			.groupBy(({ message }) => message.channelId)
			.select(({ message }) => ({
				count: count(message.id),
			}))
			.orderBy(({ message }) => message.createdAt, "desc"),
	)

	const threadMessageState = data?.[0]
	if (!threadMessageState) return null

	return (
		<button
			type="button"
			onClick={() => {
				if (threadChannelId) {
					openThread(threadChannelId, messageId)
				}
			}}
			className="mt-2 flex items-center gap-2 text-secondary text-sm transition-colors hover:text-primary"
		>
			<IconThread className="size-4" />
			<span>
				{threadMessageState.count} {threadMessageState.count === 1 ? "reply" : "replies"}
			</span>
		</button>
	)
}

export const MessageAuthorHeader = ({ message }: { message: typeof Message.Model.Type }) => {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ user: userCollection })
				.where(({ user }) => eq(user.id, message.authorId))
				.orderBy(({ user }) => user.createdAt, "desc")
				.limit(1),
		[message.authorId],
	)

	const isEdited = message.updatedAt && message.updatedAt.getTime() > message.createdAt.getTime()

	const user = data?.[0]

	if (!user) return null

	return (
		<div className="flex items-baseline gap-2">
			<span className="font-semibold">{user ? `${user.firstName} ${user.lastName}` : "Unknown"}</span>
			<span className="text-secondary text-xs">
				{format(message.createdAt, "HH:mm")}
				{isEdited && " (edited)"}
			</span>
		</div>
	)
}
