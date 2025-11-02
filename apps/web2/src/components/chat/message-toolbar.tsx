import { Flag01 } from "@untitledui/icons"
import { useEffect, useState } from "react"
import type { MessageWithPinned } from "~/atoms/chat-query-atoms"
import { EmojiPicker } from "~/components/emoji-picker"
import { Button } from "~/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, MenuLabel } from "~/components/ui/menu"
import { useChat } from "~/hooks/use-chat"
import { useEmojiStats } from "~/hooks/use-emoji-stats"
import IconCopy from "../icons/icon-copy"
import IconDotsVertical from "../icons/icon-dots-vertical"
import IconEdit from "../icons/icon-edit"
import IconEmojiAdd from "../icons/icon-emoji-add"
import IconEnvelope from "../icons/icon-envelope"
import IconReply from "../icons/icon-reply"
import IconShare from "../icons/icon-share"
import IconStar from "../icons/icon-star"
import IconThread from "../icons/icon-thread"
import IconTrash from "../icons/icon-trash"
import { DeleteMessageModal } from "./delete-message-modal"
import { useMessageHandlers } from "./message-item"

interface MessageToolbarProps {
	message: MessageWithPinned
	onMenuOpenChange?: (isOpen: boolean) => void
}

export function MessageToolbar({ message, onMenuOpenChange }: MessageToolbarProps) {
	const { addReaction } = useChat()
	const { topEmojis, trackEmojiUsage } = useEmojiStats()
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)
	const [dropdownOpen, setDropdownOpen] = useState(false)

	// Get message-specific handlers
	const messageHandlers = useMessageHandlers(message)

	// Derived state
	const isOwnMessage = messageHandlers.isOwnMessage
	const isPinned = message.pinnedMessage?.id !== undefined

	const handleReaction = (emoji: string) => {
		trackEmojiUsage(emoji)
		addReaction(message.id, emoji)
	}

	const handleEdit = () => {
		console.log("Edit not implemented in shared toolbar yet")
	}

	const handleForward = () => {
		console.log("Forward message")
	}

	const handleMarkUnread = () => {
		console.log("Mark as unread")
	}

	const handleReport = () => {
		console.log("Report message")
	}

	const handleViewDetails = () => {
		console.log("View details")
	}

	const handlePin = () => {
		messageHandlers.handlePin(isPinned, message.pinnedMessage?.id)
	}

	// Notify parent when any menu is open
	useEffect(() => {
		const isAnyMenuOpen = deleteModalOpen || dropdownOpen
		onMenuOpenChange?.(isAnyMenuOpen)
	}, [deleteModalOpen, dropdownOpen, onMenuOpenChange])

	return (
		<div
			role="toolbar"
			aria-label="Message actions"
			className="flex items-center gap-px rounded-lg border border-border bg-bg shadow-sm"
		>
			{/* Quick Reactions */}
			{topEmojis.map((emoji) => (
				<Button
					key={emoji}
					size="sq-sm"
					intent="plain"
					onPress={() => handleReaction(emoji)}
					aria-label={`React with ${emoji}`}
					className="!p-1.5 text-base hover:bg-secondary"
				>
					{emoji}
				</Button>
			))}
			<div className="mx-0.5 h-4 w-px bg-border" />

			{/* More Reactions Button */}
			<EmojiPicker onPick={handleReaction}>
				<Button
					size="sq-sm"
					intent="plain"
					aria-label="More reactions"
					className="!p-1.5 hover:bg-secondary"
				>
					<IconEmojiAdd data-slot="icon" className="size-3.5" />
				</Button>
			</EmojiPicker>

			{/* Copy Button */}
			<Button
				size="sq-sm"
				intent="plain"
				onPress={messageHandlers.handleCopy}
				aria-label="Copy message"
				className="!p-1.5 hover:bg-secondary"
			>
				<IconCopy data-slot="icon" className="size-3.5" />
			</Button>

			{/* Reply Button */}
			<Button
				size="sq-sm"
				intent="plain"
				onPress={messageHandlers.handleReply}
				aria-label="Reply to message"
				className="!p-1.5 hover:bg-secondary"
			>
				<IconReply data-slot="icon" className="size-3.5" />
			</Button>

			{/* Edit Button (Own Messages Only) */}
			{isOwnMessage && (
				<>
					<Button
						size="sq-sm"
						intent="plain"
						onPress={handleEdit}
						aria-label="Edit message"
						className="!p-1.5 hover:bg-secondary"
					>
						<IconEdit data-slot="icon" className="size-3.5" />
					</Button>

					{/* Delete Button (Own Messages Only) */}
					<Button
						size="sq-sm"
						intent="plain"
						onPress={() => setDeleteModalOpen(true)}
						aria-label="Delete message"
						className="!p-1.5 text-danger hover:bg-danger/10"
					>
						<IconTrash data-slot="icon" className="size-3.5" />
					</Button>
				</>
			)}

			{/* Divider before more options */}
			<div className="mx-0.5 h-4 w-px bg-border" />

			{/* More Options Menu */}
			<Menu>
				<MenuTrigger
					aria-label="More options"
					className="!p-1.5 hover:bg-secondary rounded-md"
				>
					<IconDotsVertical className="size-3.5" />
				</MenuTrigger>
				<MenuContent placement="bottom end">
					<MenuItem onAction={messageHandlers.handleThread}>
						<IconThread data-slot="icon" />
						<MenuLabel>Reply in thread</MenuLabel>
					</MenuItem>
					<MenuItem onAction={handleForward}>
						<IconShare data-slot="icon" />
						<MenuLabel>Forward message</MenuLabel>
					</MenuItem>
					<MenuItem onAction={handleMarkUnread}>
						<IconEnvelope data-slot="icon" />
						<MenuLabel>Mark as unread</MenuLabel>
					</MenuItem>
					<MenuItem onAction={handlePin}>
						<IconStar data-slot="icon" />
						<MenuLabel>{isPinned ? "Unpin message" : "Pin message"}</MenuLabel>
					</MenuItem>

					<MenuSeparator />

					{!isOwnMessage && (
						<MenuItem intent="danger" onAction={handleReport}>
							<Flag01 data-slot="icon" />
							<MenuLabel>Report message</MenuLabel>
						</MenuItem>
					)}
					<MenuItem onAction={handleViewDetails}>
						<MenuLabel>View details</MenuLabel>
					</MenuItem>
				</MenuContent>
			</Menu>

			{/* Delete Confirmation Modal */}
			<DeleteMessageModal
				isOpen={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				onConfirm={messageHandlers.handleDelete}
			/>
		</div>
	)
}
