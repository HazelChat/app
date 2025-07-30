import { convexQuery } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import type { FunctionReturnType } from "convex/server"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"
import { MenuTrigger } from "react-aria-components"
import { Avatar } from "~/components/base/avatar/avatar"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { useChat } from "~/hooks/use-chat"
import { cn } from "~/lib/utils"
import { TextEditor } from "../base/text-editor/text-editor"

type Message = FunctionReturnType<typeof api.messages.getMessages>["page"][0]

interface MessageItemProps {
	message: Message
}

export function MessageItem({ message }: MessageItemProps) {
	const { editMessage, deleteMessage, addReaction, removeReaction } = useChat()
	const [isEditing, setIsEditing] = useState(false)
	const [editContent, setEditContent] = useState(message.content)
	const [_showReactionPicker, setShowReactionPicker] = useState(false)

	// Get current user to check if message is from them
	const { data: currentUser } = useQuery(convexQuery(api.me.getCurrentUser, {}))
	const isOwnMessage = currentUser?._id === message.authorId

	const handleEdit = () => {
		if (editContent.trim() && editContent !== message.content) {
			editMessage(message._id, editContent)
		}
		setIsEditing(false)
	}

	const handleDelete = () => {
		deleteMessage(message._id)
	}

	const handleReaction = (emoji: string) => {
		const existingReaction = message.reactions?.find(
			(r) => r.emoji === emoji && r.userId === currentUser?._id,
		)
		if (existingReaction) {
			removeReaction(message._id, emoji)
		} else {
			addReaction(message._id, emoji)
		}
		setShowReactionPicker(false)
	}

	const commonEmojis = ["👍", "❤️", "😂", "🎉", "🤔", "👎"]

	return (
		<div className="group relative mb-4 flex gap-3 rounded px-2 py-1 hover:bg-muted/30">
			<Avatar
				size="sm"
				src={message.author.avatarUrl}
				alt={`${message.author.firstName} ${message.author.lastName}`}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="font-semibold text-sm">
						{message.author.firstName} {message.author.lastName}
					</span>
					<span className="text-muted-foreground text-xs">
						{formatDistanceToNow(new Date(message._creationTime), { addSuffix: true })}
					</span>
					{message.updatedAt && <span className="text-muted-foreground text-xs">(edited)</span>}
				</div>

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
							className="w-full rounded border border-border bg-background p-2 text-sm"
						/>
						<div className="mt-2 flex gap-2">
							<button
								onClick={handleEdit}
								className="rounded bg-primary px-3 py-1 text-primary-foreground text-xs"
							>
								Save
							</button>
							<button
								onClick={() => {
									setIsEditing(false)
									setEditContent(message.content)
								}}
								className="rounded border border-border px-3 py-1 text-xs"
							>
								Cancel
							</button>
						</div>
					</div>
				) : (
					<TextEditor.Root content={message.jsonContent}>
						<TextEditor.Content readOnly></TextEditor.Content>
					</TextEditor.Root>
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
								{} as Record<string, { count: number; users: string[]; hasReacted: boolean }>,
							),
						).map(([emoji, data]) => (
							<button
								key={emoji}
								onClick={() => handleReaction(emoji)}
								className={cn(
									"flex items-center gap-1 rounded-full px-2 py-1 text-xs",
									data.hasReacted
										? "border border-primary/30 bg-primary/20 text-primary"
										: "bg-muted hover:bg-muted/80",
								)}
							>
								<span>{emoji}</span>
								<span>{data.count}</span>
							</button>
						))}
					</div>
				)}

				{/* Thread preview */}
				{message.threadMessages && message.threadMessages.length > 0 && (
					<button className="mt-2 flex items-center gap-2 text-primary text-xs hover:underline">
						<span>{message.threadMessages.length} replies</span>
						<span className="text-muted-foreground">
							Last reply{" "}
							{formatDistanceToNow(new Date(message.threadMessages[0]._creationTime), {
								addSuffix: true,
							})}
						</span>
					</button>
				)}
			</div>
			<div className="absolute top-1 right-2 opacity-0 transition-opacity group-hover:opacity-100">
				<div className="flex items-center gap-1 rounded border border-border bg-background shadow-sm">
					{commonEmojis.slice(0, 3).map((emoji) => (
						<button
							key={emoji}
							onClick={() => handleReaction(emoji)}
							className="p-1.5 text-sm hover:bg-muted"
						>
							{emoji}
						</button>
					))}
					<Dropdown.Root>
						<MenuTrigger>
							<button className="p-1.5 hover:bg-muted">
								<span className="text-xs">+</span>
							</button>
						</MenuTrigger>
						<Dropdown.Popover>
							<Dropdown.Menu>
								{commonEmojis.map((emoji) => (
									<Dropdown.Item key={emoji} onAction={() => handleReaction(emoji)}>
										{emoji}
									</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown.Popover>
					</Dropdown.Root>

					{isOwnMessage && (
						<>
							<button
								onClick={() => setIsEditing(true)}
								className="p-1.5 text-xs hover:bg-muted"
							>
								Edit
							</button>
							<button
								onClick={handleDelete}
								className="p-1.5 text-destructive text-xs hover:bg-muted"
							>
								Delete
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
