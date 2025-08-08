import type { api } from "@hazel/backend/api"
import {
	Copy01,
	DotsVertical,
	Edit04,
	Flag01,
	Mail01,
	MessageSquare02,
	Plus,
	Share06,
	Stars02,
	Trash01,
} from "@untitledui/icons"
import type { FunctionReturnType } from "convex/server"
import { useEffect, useState } from "react"
import { Dialog, DialogTrigger, MenuTrigger, Popover } from "react-aria-components"
import { useEmojiStats } from "~/hooks/use-emoji-stats"
import { Button } from "../base/buttons/button"
import { Dropdown } from "../base/dropdown/dropdown"
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "../base/emoji-picker/emoji-picker"
import IconArrowBigTurnLeft1 from "../icons/IconArrowBigTurnLeft1"
import IconThreads from "../icons/IconThreads"
import IconThreads1 from "../icons/IconThreads1"
import { IconEmojiAdd } from "../temp-icons/emoji-add"
import { IconThread } from "../temp-icons/thread"
import { DeleteMessageModal } from "./delete-message-modal"

type Message = FunctionReturnType<typeof api.messages.getMessages>["page"][0]

interface MessageToolbarProps {
	message: Message
	isOwnMessage: boolean
	isPinned?: boolean
	onReaction: (emoji: string) => void
	onEdit: () => void
	onDelete: () => void
	onCopy: () => void
	onReply?: () => void
	onThread?: () => void
	onForward?: () => void
	onMarkUnread?: () => void
	onPin?: () => void
	onReport?: () => void
	onViewDetails?: () => void
	onMenuOpenChange?: (isOpen: boolean) => void
}

export function MessageToolbar({
	message,
	isOwnMessage,
	isPinned = false,
	onReaction,
	onEdit,
	onDelete,
	onCopy,
	onReply,
	onThread,
	onForward,
	onMarkUnread,
	onPin,
	onReport,
	onViewDetails,
	onMenuOpenChange,
}: MessageToolbarProps) {
	const { topEmojis, trackEmojiUsage } = useEmojiStats()
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)
	const [dropdownOpen, setDropdownOpen] = useState(false)

	const handleReaction = (emoji: string) => {
		trackEmojiUsage(emoji)
		onReaction(emoji)
	}

	// Notify parent when any menu is open
	useEffect(() => {
		const isAnyMenuOpen = emojiPickerOpen || deleteModalOpen || dropdownOpen
		onMenuOpenChange?.(isAnyMenuOpen)
	}, [emojiPickerOpen, deleteModalOpen, dropdownOpen, onMenuOpenChange])

	const isAnyMenuOpen = emojiPickerOpen || deleteModalOpen || dropdownOpen

	return (
		<div
			className={`-translate-y-1/2 absolute top-0 right-2 transition-opacity ${isAnyMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
		>
			<div className="flex items-center gap-px rounded-lg border border-primary bg-primary shadow-sm">
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
					onClick={onCopy}
					aria-label="Copy message"
					className="!p-1.5 hover:bg-secondary"
				>
					<Copy01 className="size-3.5" />
				</Button>

				{onReply && (
					<Button
						size="sm"
						color="tertiary"
						onClick={onReply}
						aria-label="Reply to message"
						className="!p-1.5 hover:bg-secondary"
					>
						<IconArrowBigTurnLeft1 className="size-3.5" />
					</Button>
				)}

				{isOwnMessage && (
					<>
						<Button
							size="sm"
							color="tertiary"
							onClick={onEdit}
							aria-label="Edit message"
							className="!p-1.5 hover:bg-secondary"
						>
							<Edit04 className="size-3.5" />
						</Button>

						<Button
							size="sm"
							color="tertiary-destructive"
							onClick={() => setDeleteModalOpen(true)}
							aria-label="Delete message"
							className="!p-1.5 hover:bg-error-primary"
						>
							<Trash01 className="size-3.5" />
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
							<DotsVertical className="size-3.5" />
						</Button>
					</MenuTrigger>
					<Dropdown.Popover placement="bottom end">
						<Dropdown.Menu>
							{onThread && (
								<Dropdown.Item onAction={onThread} icon={IconThread} label="Reply in thread" />
							)}
							{onForward && (
								<Dropdown.Item onAction={onForward} icon={Share06} label="Forward message" />
							)}
							{onMarkUnread && (
								<Dropdown.Item onAction={onMarkUnread} icon={Mail01} label="Mark as unread" />
							)}
							{onPin && (
								<Dropdown.Item
									onAction={onPin}
									icon={Stars02}
									label={isPinned ? "Unpin message" : "Pin message"}
								/>
							)}

							<Dropdown.Separator />

							{!isOwnMessage && onReport && (
								<Dropdown.Item onAction={onReport} icon={Flag01} label="Report message" />
							)}
							{onViewDetails && (
								<Dropdown.Item onAction={onViewDetails} label="View details" addon="⌘I" />
							)}
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown.Root>
			</div>

			{/* Delete Confirmation Modal */}
			<DeleteMessageModal
				isOpen={deleteModalOpen}
				onOpenChange={setDeleteModalOpen}
				onConfirm={onDelete}
			/>
		</div>
	)
}
