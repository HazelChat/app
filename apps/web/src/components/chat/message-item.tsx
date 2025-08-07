import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import type { Editor } from "@tiptap/react"
import type { FunctionReturnType } from "convex/server"
import { format } from "date-fns"
import { useState } from "react"
import { Button } from "react-aria-components"
import { toast } from "sonner"
import { useChat } from "~/hooks/use-chat"
import { cx } from "~/utils/cx"
import { IconNotification } from "../application/notifications/notifications"
import { Avatar } from "../base/avatar/avatar"
import { Badge } from "../base/badges/badges"
import { Button as StyledButton } from "../base/buttons/button"
import { TextEditor as EditableTextEditor } from "../base/text-editor/text-editor"
import { MessageReplySection } from "./message-reply-section"
import { MessageToolbar } from "./message-toolbar"
import { TextEditor } from "./read-only-message"

type Message = FunctionReturnType<typeof api.messages.getMessages>["page"][0]

interface MessageItemProps {
	message: Message
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
	isPinned = false,
}: MessageItemProps) {
	const { orgId } = useParams({ from: "/app/$orgId" })
	const {
		editMessage,
		deleteMessage,
		addReaction,
		removeReaction,
		setReplyToMessageId,
		pinMessage,
		unpinMessage,
		pinnedMessages,
	} = useChat()
	const [isEditing, setIsEditing] = useState(false)

	const { data: currentUser } = useQuery(
		convexQuery(api.me.getCurrentUser, {
			organizationId: orgId as Id<"organizations">,
		}),
	)
	const isOwnMessage = currentUser?._id === message.authorId

	const showAvatar = isGroupStart || !!message.replyToMessageId
	const isRepliedTo = !!message.replyToMessageId
	const isMessagePinned = pinnedMessages?.some((p) => p.messageId === message._id) || false

	const handleReaction = (emoji: string) => {
		const existingReaction = message.reactions?.find(
			(r) => r.emoji === emoji && r.userId === currentUser?._id,
		)
		if (existingReaction) {
			removeReaction(message._id, emoji)
		} else {
			addReaction(message._id, emoji)
		}
	}

	const handleEdit = async (editor: Editor) => {
		const content = editor.getText()
		const jsonContent = editor.getJSON()
		if (
			content.trim() &&
			(content !== message.content ||
				JSON.stringify(jsonContent) !== JSON.stringify(message.jsonContent))
		) {
			try {
				await editMessage(message._id, content, jsonContent)
				setIsEditing(false)
			} catch (error) {
				console.error("Failed to edit message:", error)
				toast.custom((t) => (
					<IconNotification
						title="Failed to edit message"
						description="Please try again later."
						color="error"
						onClose={() => toast.dismiss(t)}
					/>
				))
			}
		} else {
			setIsEditing(false)
		}
	}

	const handleDelete = () => {
		deleteMessage(message._id)
	}

	const handleCopy = () => {
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

	return (
		<div
			id={`message-${message._id}`}
			className={cx(
				`group relative flex flex-col rounded-md rounded-l-none px-4 py-0.5 transition-colors hover:bg-secondary`,
				isGroupStart ? "mt-2" : "",
				isGroupEnd ? "mb-2" : "",
				isFirstNewMessage
					? "border-emerald-500 border-l-2 bg-emerald-500/20 hover:bg-emerald-500/15"
					: "",
				isMessagePinned ? "border-amber-500 border-l-2 bg-amber-500/10 hover:bg-amber-500/15" : "",
			)}
			data-id={message._id}
		>
			{/* Reply Section */}
			{isRepliedTo && message.replyToMessageId && (
				<MessageReplySection
					replyToMessageId={message.replyToMessageId}
					channelId={message.channelId}
					organizationId={orgId as Id<"organizations">}
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
					<Avatar
						size="md"
						alt={`${message.author.firstName} ${message.author.lastName}`}
						src={message.author.avatarUrl}
					/>
				) : (
					<div className="flex w-10 items-center justify-end pr-1 text-[10px] text-secondary leading-tight opacity-0 group-hover:opacity-100">
						{format(message._creationTime, "HH:mm")}
					</div>
				)}

				{/* Content Section */}
				<div className="min-w-0 flex-1">
					{/* Author header (only when showing avatar) */}
					{showAvatar && (
						<div className="flex items-baseline gap-2">
							<span className="font-semibold">
								{message.author
									? `${message.author.firstName} ${message.author.lastName}`
									: "Unknown"}
							</span>
							<span className="text-secondary text-xs">
								{format(message._creationTime, "HH:mm")}
							</span>
						</div>
					)}

					{/* Message Content */}
					{isEditing ? (
						<div className="mt-1">
							<EditableTextEditor.Root
								content={message.jsonContent}
								className="gap-0"
								inputClassName="min-h-[2rem] p-2 text-sm"
								onSubmit={handleEdit}
								editorProps={{
									handleDOMEvents: {
										keydown: (_view: any, event: KeyboardEvent) => {
											if (event.key === "Escape") {
												setIsEditing(false)
												return true
											}
											return false
										},
									},
								}}
							>
								{(editor) => (
									<>
										<EditableTextEditor.Content />
										<div className="mt-2 flex gap-2">
											<StyledButton
												size="sm"
												color="primary"
												onClick={async () => await handleEdit(editor)}
											>
												Save
											</StyledButton>
											<StyledButton
												size="sm"
												color="secondary"
												onClick={() => {
													setIsEditing(false)
													editor.commands.setContent(message.jsonContent)
												}}
											>
												Cancel
											</StyledButton>
										</div>
									</>
								)}
							</EditableTextEditor.Root>
						</div>
					) : (
						<TextEditor.Root content={message.jsonContent}>
							<TextEditor.Content readOnly />
						</TextEditor.Root>
					)}

					{/* Attachments Grid Placeholder */}
					{message.attachedFiles && message.attachedFiles.length > 0 && (
						<div
							className={`mt-2 grid max-w-lg gap-1${message.attachedFiles.length === 1 ? "grid-cols-1" : "grid-cols-2"}
							${message.attachedFiles.length === 3 ? "grid-cols-3" : ""}
						`}
						>
							{message.attachedFiles.slice(0, 4).map((file, index) => (
								<div
									key={file}
									className={`relative aspect-square cursor-pointer overflow-hidden rounded transition-opacity hover:opacity-90${message.attachedFiles!.length === 1 ? "col-span-2 aspect-auto max-w-[400px]" : ""}
										${message.attachedFiles!.length === 3 && index === 0 ? "col-span-2 row-span-2" : ""}
									`}
								>
									<div className="h-full w-full bg-muted" />
									{message.attachedFiles!.length > 4 && index === 3 && (
										<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
											<span className="font-semibold text-lg text-white">
												+{message.attachedFiles!.length - 4}
											</span>
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* Reactions */}
					{message.reactions && message.reactions.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{Object.entries(
								message.reactions.reduce(
									(acc, reaction) => {
										if (!acc[reaction.emoji]) {
											acc[reaction.emoji] = { count: 0, users: [], hasReacted: false }
										}
										acc[reaction.emoji].count++
										acc[reaction.emoji].users.push(reaction.userId)
										if (reaction.userId === currentUser?._id) {
											acc[reaction.emoji].hasReacted = true
										}
										return acc
									},
									{} as Record<
										string,
										{ count: number; users: string[]; hasReacted: boolean }
									>,
								),
							).map(([emoji, data]) => (
								<Button onPress={() => handleReaction(emoji)}>
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

					{/* Thread Button Placeholder */}
					{message.threadChannelId && (
						<button
							type="button"
							className="mt-2 flex items-center gap-2 text-secondary text-sm hover:text-primary"
						>
							<div className="size-4 rounded bg-muted-foreground/20" />
							<span>Thread replies</span>
						</button>
					)}
				</div>
			</div>

			{/* Message Toolbar */}
			<MessageToolbar
				message={message}
				isOwnMessage={isOwnMessage}
				isPinned={isMessagePinned}
				onReaction={handleReaction}
				onEdit={() => setIsEditing(true)}
				onDelete={handleDelete}
				onCopy={handleCopy}
				onReply={() => {
					setReplyToMessageId(message._id)
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
						unpinMessage(message._id)
					} else {
						pinMessage(message._id)
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
			/>
		</div>
	)
}
