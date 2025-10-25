import { Flag01 } from "@untitledui/icons"
import { useEffect, useState } from "react"
import { Dialog, DialogTrigger, MenuTrigger, Popover, Toolbar } from "react-aria-components"
import type { MessageWithPinned } from "~/atoms/chat-query-atoms"
import { useChat } from "~/hooks/use-chat"
import { useEmojiStats } from "~/hooks/use-emoji-stats"
import { Button } from "../base/buttons/button"
import { Dropdown } from "../base/dropdown/dropdown"
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "../base/emoji-picker/emoji-picker"
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
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
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
		const isAnyMenuOpen = emojiPickerOpen || deleteModalOpen || dropdownOpen
		onMenuOpenChange?.(isAnyMenuOpen)
	}, [emojiPickerOpen, deleteModalOpen, dropdownOpen, onMenuOpenChange])

	return (
		<Toolbar
			aria-label="Message actions"
			className="flex items-center gap-px rounded-lg border border-primary bg-primary shadow-sm"
		>
			{/* Quick Reactions */}
			{topEmojis.map((emoji) => (
				<Button
					key={emoji}
					size="sm"
					color="tertiary"
					onClick={() => handleReaction(emoji)}
					aria-label={`React with ${emoji}`}
					className="!p-1.5 hover:bg-secondary"
				>
					{emoji}
				</Button>
			))}
			<div className="mx-0.5 h-4 w-px bg-border-primary" />

			<DialogTrigger isOpen={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
				<Button
					size="sm"
					color="tertiary"
					aria-label="More reactions"
					className="!p-1.5 hover:bg-secondary"
				>
					<IconEmojiAdd className="size-3.5" />
				</Button>
				<Popover>
					<Dialog className="rounded-lg">
						<EmojiPicker
							className="h-[342px]"
							onEmojiSelect={(emoji) => {
								handleReaction(emoji.emoji)
								setEmojiPickerOpen(false)
							}}
						>
							<EmojiPickerSearch />
							<EmojiPickerContent />
							<EmojiPickerFooter />
						</EmojiPicker>
					</Dialog>
				</Popover>
			</DialogTrigger>

			{/* Action Buttons */}
			<Button
				size="sm"
				color="tertiary"
				onClick={messageHandlers.handleCopy}
				aria-label="Copy message"
				className="!p-1.5 hover:bg-secondary"
			>
				<IconCopy className="size-3.5" />
			</Button>

			<Button
				size="sm"
				color="tertiary"
				onClick={messageHandlers.handleReply}
				aria-label="Reply to message"
				className="!p-1.5 hover:bg-secondary"
			>
				<IconReply className="size-3.5" />
			</Button>

			{isOwnMessage && (
				<>
					<Button
						size="sm"
						color="tertiary"
						onClick={handleEdit}
						aria-label="Edit message"
						className="!p-1.5 hover:bg-secondary"
					>
						<IconEdit className="size-3.5" />
					</Button>

					<Button
						size="sm"
						color="tertiary-destructive"
						onClick={() => setDeleteModalOpen(true)}
						aria-label="Delete message"
						className="!p-1.5 hover:bg-error-primary"
					>
						<IconTrash className="size-3.5" />
					</Button>
				</>
			)}

			{/* Divider before more options */}
			<div className="mx-0.5 h-4 w-px bg-border" />

			{/* More Options Dropdown */}
			<Dropdown.Root onOpenChange={setDropdownOpen}>
				<MenuTrigger>
					<Button
						size="sm"
						color="tertiary"
						aria-label="More options"
						className="!p-1.5 hover:bg-secondary"
					>
						<IconDotsVertical className="size-3.5" />
					</Button>
				</MenuTrigger>
				<Dropdown.Popover placement="bottom end" className="w-44">
					<Dropdown.Menu>
						<Dropdown.Item
							onAction={messageHandlers.handleThread}
							icon={IconThread}
							label="Reply in thread"
						/>
						<Dropdown.Item onAction={handleForward} icon={IconShare} label="Forward message" />
						<Dropdown.Item
							onAction={handleMarkUnread}
							icon={IconEnvelope}
							label="Mark as unread"
						/>
						<Dropdown.Item
							onAction={handlePin}
							icon={IconStar}
							label={isPinned ? "Unpin message" : "Pin message"}
						/>

						<Dropdown.Separator />

						{!isOwnMessage && (
							<Dropdown.Item onAction={handleReport} icon={Flag01} label="Report message" />
						)}
						<Dropdown.Item onAction={handleViewDetails} label="View details" addon="⌘I" />
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>

			{/* Delete Confirmation Modal */}
			<DeleteMessageModal
				isOpen={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				onConfirm={messageHandlers.handleDelete}
			/>
		</Toolbar>
	)
}
