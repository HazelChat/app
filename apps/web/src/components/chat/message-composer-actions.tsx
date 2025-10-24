import { ItalicSquare } from "@untitledui/icons"
import { forwardRef, useRef, useState } from "react"
import { Dialog, DialogTrigger, Popover } from "react-aria-components"
import { useEmojiStats } from "~/hooks/use-emoji-stats"
import { useFileUpload } from "~/hooks/use-file-upload"
import { useOrganization } from "~/hooks/use-organization"
import { useChat } from "~/providers/chat-provider"
import { Button } from "../base/buttons/button"
import { ButtonUtility } from "../base/buttons/button-utility"
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "../base/emoji-picker/emoji-picker"
import IconEmoji1 from "../icons/icon-emoji-1"
import IconPaperclip2 from "../icons/icon-paperclip2"

export interface MessageComposerActionsRef {
	cleanup: () => void
}

interface MessageComposerActionsProps {
	onSubmit?: () => Promise<void>
	onEmojiSelect?: (emoji: string) => void
}

export const MessageComposerActions = forwardRef<MessageComposerActionsRef, MessageComposerActionsProps>(
	({ onEmojiSelect }, _ref) => {
		const { organizationId } = useOrganization()
		const fileInputRef = useRef<HTMLInputElement>(null)
		const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
		const [isUploading, setIsUploading] = useState(false)
		const { trackEmojiUsage } = useEmojiStats()

		const { channelId, addAttachment } = useChat()

		const { uploadFile } = useFileUpload({
			organizationId: organizationId!,
			channelId,
		})

		const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files
			if (files && files.length > 0) {
				setIsUploading(true)
				// Upload files sequentially
				for (const file of Array.from(files)) {
					const attachmentId = await uploadFile(file)
					if (attachmentId) {
						addAttachment(attachmentId)
					}
				}
				setIsUploading(false)
			}
			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		}

		return (
			<>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					className="hidden"
					onChange={handleFileSelect}
					accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
				/>

				{/* Bottom action bar */}
				<div className="flex w-full items-center justify-between gap-3 px-3 py-2">
					<div className="flex items-center gap-3"></div>

					<div className="flex items-center gap-3">
						{/* Shortcuts button */}
						<Button
							size="sm"
							color="link-gray"
							iconLeading={<ItalicSquare data-icon className="size-4!" />}
							className="font-semibold text-xs"
						>
							Shortcuts
						</Button>

						{/* Attach button */}
						<Button
							size="sm"
							color="link-gray"
							iconLeading={<IconPaperclip2 data-icon className="size-4!" />}
							className="font-semibold text-xs"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
						>
							Attach
						</Button>

						{/* Emoji picker */}
						<DialogTrigger isOpen={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
							<ButtonUtility icon={IconEmoji1} size="xs" color="tertiary" />
							<Popover>
								<Dialog className="rounded-lg">
									<EmojiPicker
										className="h-[342px]"
										onEmojiSelect={(emoji) => {
											if (onEmojiSelect) {
												trackEmojiUsage(emoji.emoji)
												onEmojiSelect(emoji.emoji)
											}
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
					</div>
				</div>
			</>
		)
	},
)
