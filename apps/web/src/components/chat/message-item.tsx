import { convexQuery } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { DownloadCloud02, RefreshCcw02 } from "@untitledui/icons"
import type { FunctionReturnType } from "convex/server"
import { format } from "date-fns"
import { useState } from "react"
import { Button } from "react-aria-components"
import { useChat } from "~/hooks/use-chat"
import { cx } from "~/utils/cx"
import { Avatar } from "../base/avatar/avatar"
import { Badge, BadgeIcon, BadgeWithIcon } from "../base/badges/badges"
import { Button as StyledButton } from "../base/buttons/button"
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
	const { editMessage, deleteMessage, addReaction, removeReaction, setReplyToMessageId } = useChat()
	const [isEditing, setIsEditing] = useState(false)
	const [editContent, setEditContent] = useState(message.content)

	const { data: currentUser } = useQuery(convexQuery(api.me.getCurrentUser, {}))
	const isOwnMessage = currentUser?._id === message.authorId

	const showAvatar = isGroupStart || !!message.replyToMessageId
	const isRepliedTo = !!message.replyToMessageId

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

	const handleEdit = () => {
		if (editContent.trim() && editContent !== message.content) {
			editMessage(message._id, editContent)
		}
		setIsEditing(false)
	}

	const handleDelete = () => {
		deleteMessage(message._id)
	}

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content)
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
				isPinned ? "border-primary border-l-2 bg-primary/20 hover:bg-primary/15" : "",
			)}
			data-id={message._id}
		>
			{/* Reply Section */}
			{isRepliedTo && (
				<div className="relative">
					{/* Reply curve SVG */}
					<svg
						className="absolute top-2 left-8 rotate-180 text-secondary"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
					>
						<path
							d="M12 2 L12 8 Q12 12 8 12 L2 12"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							fill="none"
						/>
					</svg>

					{/* Reply content placeholder */}
					<button
						type="button"
						className="flex w-fit items-center gap-1 pl-12 text-left hover:bg-transparent"
					>
						<div className="size-4 rounded-full bg-muted" />
						<span className="text-secondary text-sm hover:underline">@ReplyAuthor</span>
						<span className="text-ellipsis text-foreground text-xs">
							Reply content preview...
						</span>
					</button>
				</div>
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
							<textarea
								value={editContent}
								onChange={(e) => setEditContent(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault()
										handleEdit()
									}
									if (e.key === "Escape") {
										setIsEditing(false)
										setEditContent(message.content)
									}
								}}
								className="w-full rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<div className="mt-2 flex gap-2">
								<StyledButton size="sm" color="primary" onClick={handleEdit}>
									Save
								</StyledButton>
								<StyledButton
									size="sm"
									color="secondary"
									onClick={() => {
										setIsEditing(false)
										setEditContent(message.content)
									}}
								>
									Cancel
								</StyledButton>
							</div>
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

					{/* <Dropdown.Root>
						<Button>
							<span className="text-xs">+</span>
						</Button>
						<Dropdown.Popover>
							<Dropdown.Menu>
								{["👍", "❤️", "😂", "🎉", "🤔", "👎"].map((emoji) => (
									<Dropdown.Item key={emoji} onAction={() => handleReaction(emoji)}>
										{emoji}
									</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown.Popover>
					</Dropdown.Root> */}

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
					// TODO: Implement pin message
					console.log("Pin message")
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
