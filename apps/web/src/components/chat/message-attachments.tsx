import type { Attachment } from "@hazel/db/models"
import type { MessageId } from "@hazel/db/schema"
import { FileIcon } from "@untitledui/file-icons"
import { Download01 } from "@untitledui/icons"
import { useState } from "react"
import { useAttachments } from "~/db/hooks"
import { cx } from "~/utils/cx"
import { formatFileSize, getFileTypeFromName } from "~/utils/file-utils"
import { ButtonUtility } from "../base/buttons/button-utility"

interface MessageAttachmentsProps {
	messageId: MessageId
}

interface AttachmentItemProps {
	attachment: typeof Attachment.Model.Type
}

function AttachmentItem({ attachment }: AttachmentItemProps) {
	const [imageError, setImageError] = useState(false)
	const fileType = getFileTypeFromName(attachment.fileName)

	const handleDownload = () => {
		// Create a temporary anchor element to trigger download
		const link = document.createElement("a")
		const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-hazel.r2.dev"
		link.href = `${publicUrl}/${attachment.id}`
		link.download = attachment.fileName
		link.target = "_blank"
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	// Check if it's an image or video based on extension
	const isImage = ["jpg", "png", "gif", "webp", "svg"].includes(fileType)
	const isVideo = ["mp4", "webm"].includes(fileType)

	if (isImage && !imageError) {
		// Display image with preview
		const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-hazel.r2.dev"
		const imageUrl = `${publicUrl}/${attachment.id}`

		return (
			<div className="group relative inline-block">
				<div className="relative overflow-hidden rounded-lg bg-secondary">
					<img
						src={imageUrl}
						alt={attachment.fileName}
						className="h-48 w-64 object-cover"
						onError={() => setImageError(true)}
					/>
					<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
						<ButtonUtility
							icon={Download01}
							size="sm"
							color="secondary"
							className="bg-primary"
							aria-label="Download file"
							onClick={handleDownload}
						/>
					</div>
				</div>
				<div className="mt-1 text-secondary text-xs">{attachment.fileName}</div>
			</div>
		)
	}

	if (isVideo) {
		// Display video player
		const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-hazel.r2.dev"
		const videoUrl = `${publicUrl}/${attachment.id}`

		return (
			<div className="group relative inline-block">
				<div className="relative overflow-hidden rounded-lg bg-secondary">
					{/** biome-ignore lint/a11y/useMediaCaption: video caption not required for chat attachments */}
					<video src={videoUrl} className="h-48 w-64 object-cover" controls preload="metadata">
						Your browser does not support the video tag.
					</video>
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
						<ButtonUtility
							icon={Download01}
							size="sm"
							color="secondary"
							className="pointer-events-auto bg-primary"
							aria-label="Download file"
							onClick={handleDownload}
						/>
					</div>
				</div>
				<div className="mt-1 text-secondary text-xs">{attachment.fileName}</div>
			</div>
		)
	}

	// For other files, show a compact file card
	return (
		<div className="group flex items-center gap-3 rounded-lg bg-secondary p-3 transition-colors hover:bg-tertiary">
			<FileIcon type={fileType} className="size-10 text-fg-quaternary" />
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium text-secondary text-sm">{attachment.fileName}</div>
				<div className="text-quaternary text-xs">{formatFileSize(attachment.fileSize)}</div>
			</div>
			<ButtonUtility
				icon={Download01}
				size="sm"
				color="tertiary"
				className="opacity-0 transition-opacity group-hover:opacity-100"
				aria-label="Download file"
				onClick={handleDownload}
			/>
		</div>
	)
}

export function MessageAttachments({ messageId }: MessageAttachmentsProps) {
	const { attachments } = useAttachments(messageId)

	if (attachments.length === 0) {
		return null
	}

	// Check if all attachments are images/videos for grid layout
	const allMedia = attachments.every((attachment) => {
		const fileType = getFileTypeFromName(attachment.fileName)
		return ["jpg", "png", "gif", "webp", "svg", "mp4", "webm"].includes(fileType)
	})

	return (
		<div
			className={cx(
				"mt-2",
				allMedia ? "grid max-w-2xl grid-cols-2 gap-2" : "flex max-w-md flex-col gap-2",
			)}
		>
			{attachments.map((attachment) => (
				<AttachmentItem key={attachment.id} attachment={attachment} />
			))}
		</div>
	)
}
