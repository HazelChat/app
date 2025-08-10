import type { Editor } from "@tiptap/react"
import type { Id } from "@hazel/backend"
import { Attachment01, FaceSmile, XClose } from "@untitledui/icons"
import { useParams } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useFileUpload } from "~/hooks/use-file-upload"
import { cx } from "~/utils/cx"
import { FileUpload } from "../application/file-upload/file-upload-base"
import { Button } from "../base/buttons/button"
import { ButtonUtility } from "../base/buttons/button-utility"
import { useEditorContext } from "../base/text-editor/text-editor"

interface MessageComposerActionsProps {
	onSubmit?: (editor: Editor, attachmentIds: Id<"attachments">[]) => Promise<void>
	onAttachmentsChange?: (attachmentIds: Id<"attachments">[]) => void
}

export const MessageComposerActions = ({ onSubmit, onAttachmentsChange }: MessageComposerActionsProps) => {
	const editor = useEditorContext()
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [attachmentIds, setAttachmentIds] = useState<Id<"attachments">[]>([])
	const [showUploadProgress, setShowUploadProgress] = useState(false)

	const { uploadFiles, uploads, removeUpload, clearUploads, isUploading } = useFileUpload({
		organizationId: orgId as Id<"organizations">,
		onUploadComplete: (attachmentId) => {
			setAttachmentIds((prev) => [...prev, attachmentId])
			onAttachmentsChange?.([...attachmentIds, attachmentId])
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

	const handleRemoveAttachment = (attachmentId: Id<"attachments">) => {
		setAttachmentIds((prev) => prev.filter((id) => id !== attachmentId))
		onAttachmentsChange?.(attachmentIds.filter((id) => id !== attachmentId))
	}

	const handleSubmit = async () => {
		if (onSubmit) {
			await onSubmit(editor.editor, attachmentIds)
			// Clear attachments after successful send
			setAttachmentIds([])
			clearUploads()
			setShowUploadProgress(false)
		}
	}

	return (
		<>
			{/* Upload Progress */}
			{showUploadProgress && uploads.length > 0 && (
				<div className="absolute left-0 right-0 bottom-full mb-2 mx-3">
					<div className="rounded-lg bg-primary p-2 ring-1 ring-secondary ring-inset">
						<div className="flex items-center justify-between mb-1">
							<span className="text-xs text-secondary font-medium">Uploading files...</span>
							<ButtonUtility
								icon={XClose}
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
											<span className="text-xs text-tertiary truncate max-w-[200px]">
												{upload.fileName}
											</span>
											<span className="text-xs text-quaternary">{upload.progress}%</span>
										</div>
										<div className="mt-0.5 h-1 bg-secondary rounded-full overflow-hidden">
											<div
												className={cx(
													"h-full transition-all duration-300",
													upload.status === "complete" ? "bg-success" : "bg-brand",
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

			{/* Attached Files Preview */}
			{attachmentIds.length > 0 && (
				<div className="absolute left-0 right-0 bottom-full mb-2 mx-3">
					<div className="flex flex-wrap gap-2">
						{attachmentIds.map((id) => (
							<div
								key={id}
								className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
							>
								<Attachment01 className="size-3 text-fg-quaternary" />
								<span className="text-xs text-secondary">File attached</span>
								<ButtonUtility
									icon={XClose}
									size="xs"
									color="tertiary"
									onClick={() => handleRemoveAttachment(id)}
								/>
							</div>
						))}
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

			<div className="absolute right-3.5 bottom-2 flex items-center gap-2">
				<div className="flex items-center gap-0.5">
					<ButtonUtility
						icon={Attachment01}
						size="xs"
						color="tertiary"
						onClick={() => fileInputRef.current?.click()}
						disabled={isUploading}
					/>
					<ButtonUtility icon={FaceSmile} size="xs" color="tertiary" />
				</div>

				<Button
					size="sm"
					color="link-color"
					onClick={handleSubmit}
					disabled={isUploading}
				>
					Send
				</Button>
			</div>
		</>
	)
}
