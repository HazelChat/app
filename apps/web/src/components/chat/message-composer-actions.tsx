import type { AttachmentId } from "@hazel/db/schema"
import { ItalicSquare } from "@untitledui/icons"
import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { Dialog, DialogTrigger, Popover } from "react-aria-components"
import { useChat } from "~/hooks/use-chat"
import { useEmojiStats } from "~/hooks/use-emoji-stats"
import { useFileUpload } from "~/hooks/use-file-upload"
import { useOrganization } from "~/hooks/use-organization"
import { cx } from "~/utils/cx"
import { Button } from "../base/buttons/button"
import { ButtonUtility } from "../base/buttons/button-utility"
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "../base/emoji-picker/emoji-picker"
import IconClose from "../icons/icon-close"
import IconEmoji1 from "../icons/icon-emoji-1"
import IconPaperclip2 from "../icons/icon-paperclip2"

export interface MessageComposerActionsRef {
	cleanup: () => void
}

interface MessageComposerActionsProps {
	attachmentIds: AttachmentId[]
	setAttachmentIds: (ids: AttachmentId[]) => void
	uploads: Array<{
		fileId: string
		fileName: string
		progress: number
		status: string
		attachmentId?: AttachmentId
	}>
	onSubmit?: () => Promise<void>
	onEmojiSelect?: (emoji: string) => void
}

export const MessageComposerActions = forwardRef<MessageComposerActionsRef, MessageComposerActionsProps>(
	({ attachmentIds, setAttachmentIds, uploads, onEmojiSelect }, ref) => {
		const { organizationId } = useOrganization()
		const fileInputRef = useRef<HTMLInputElement>(null)
		const [showUploadProgress, setShowUploadProgress] = useState(false)
		const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
		const { trackEmojiUsage } = useEmojiStats()

		const { channelId } = useChat()

		const { uploadFiles, clearUploads, isUploading } = useFileUpload({
			organizationId: organizationId!,
			channelId,
			onUploadComplete: (attachmentId) => {
				setAttachmentIds([...attachmentIds, attachmentId])
			},
		})

		const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files
			if (files && files.length > 0) {
				setShowUploadProgress(true)
				await uploadFiles(files)
			}
			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		}

		useImperativeHandle(
			ref,
			() => ({
				cleanup: () => {
					clearUploads()
					setShowUploadProgress(false)
				},
			}),
			[clearUploads],
		)

		return (
			<>
				{/* Upload Progress */}
				{showUploadProgress && uploads.length > 0 && (
					<div className="absolute right-0 bottom-full left-0 mx-3 mb-2">
						<div className="inset-ring inset-ring-secondary rounded-lg bg-primary p-2">
							<div className="mb-1 flex items-center justify-between">
								<span className="font-medium text-secondary text-xs">Uploading files...</span>
								<ButtonUtility
									icon={IconClose}
									size="xs"
									color="tertiary"
									onClick={() => setShowUploadProgress(false)}
								/>
							</div>
							<div className="space-y-1">
								{uploads.map((upload) => (
									<div key={upload.fileId} className="flex items-center gap-2">
										<div className="flex-1">
											<div className="flex items-center justify-between">
												<span className="max-w-[200px] truncate text-tertiary text-xs">
													{upload.fileName}
												</span>
												<span className="text-quaternary text-xs">
													{upload.progress}%
												</span>
											</div>
											<div className="mt-0.5 h-1 overflow-hidden rounded-full bg-secondary">
												<div
													className={cx(
														"h-full transition-all duration-300",
														upload.status === "complete"
															? "bg-success"
															: "bg-brand",
														upload.status === "failed" && "bg-error",
													)}
													style={{ width: `${upload.progress}%` }}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}

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
