import type { Attachment } from "@hazel/db/models"
import type { MessageId } from "@hazel/db/schema"
import { FileIcon } from "@untitledui/file-icons"
import { Download01 } from "@untitledui/icons"
import { useState } from "react"
import { useAttachments } from "~/db/hooks"
import { cn } from "~/lib/utils"
import { formatFileSize, getFileTypeFromName } from "~/utils/file-utils"
import { Button } from "../ui/button"

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
				<div className="relative overflow-hidden rounded-lg border border-border bg-secondary shadow-sm">
					<img
						src={imageUrl}
						alt={attachment.fileName}
						className="h-48 w-64 object-cover"
						onError={() => setImageError(true)}
					/>
					<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
						<Button
							intent="secondary"
							size="sq-sm"
							onPress={handleDownload}
							aria-label="Download file"
							className="bg-bg"
						>
							<Download01 data-slot="icon" />
						</Button>
					</div>
				</div>
			</div>
		)
	}

	if (isVideo) {
		// Display video player
		const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://pub-hazel.r2.dev"
		const videoUrl = `${publicUrl}/${attachment.id}`

		return (
			<div className="group relative inline-block">
				<div className="relative overflow-hidden rounded-lg border border-border bg-secondary shadow-sm">
					{/** biome-ignore lint/a11y/useMediaCaption: video caption not required for chat attachments */}
					<video src={videoUrl} className="h-48 w-64 object-cover" controls preload="metadata">
						Your browser does not support the video tag.
					</video>
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
						<Button
							intent="secondary"
							size="sq-sm"
							onPress={handleDownload}
							aria-label="Download file"
							className="pointer-events-auto bg-bg"
						>
							<Download01 data-slot="icon" />
						</Button>
					</div>
				</div>
				<div className="mt-1 text-muted-fg text-xs">{attachment.fileName}</div>
			</div>
		)
	}

	// For other files, show a compact file card
	return (
		<div className="group flex items-center gap-3 rounded-lg border border-border bg-secondary p-3 shadow-sm transition-colors hover:bg-muted">
			<FileIcon type={fileType} className="size-10 text-muted-fg" />
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium text-fg text-sm">{attachment.fileName}</div>
				<div className="text-muted-fg text-xs">{formatFileSize(attachment.fileSize)}</div>
			</div>
			<Button
				intent="plain"
				size="sq-sm"
				onPress={handleDownload}
				aria-label="Download file"
				className="opacity-0 transition-opacity group-hover:opacity-100"
			>
				<Download01 data-slot="icon" />
			</Button>
		</div>
	)
}

export function MessageAttachments({ messageId }: MessageAttachmentsProps) {
	const { attachments } = useAttachments(messageId)

	if (attachments.length === 0) {
		return null
	}

	// Separate attachments by type
	const images = attachments.filter((attachment) => {
		const fileType = getFileTypeFromName(attachment.fileName)
		return ["jpg", "png", "gif", "webp", "svg"].includes(fileType)
	})

	const videos = attachments.filter((attachment) => {
		const fileType = getFileTypeFromName(attachment.fileName)
		return ["mp4", "webm"].includes(fileType)
	})

	const otherFiles = attachments.filter((attachment) => {
		const fileType = getFileTypeFromName(attachment.fileName)
		return !["jpg", "png", "gif", "webp", "svg", "mp4", "webm"].includes(fileType)
	})

	// Discord-style grid classes based on image count
	const getImageGridClass = (count: number) => {
		if (count === 1) return "grid max-w-2xl grid-cols-1 gap-2"
		if (count === 2) return "grid max-w-2xl grid-cols-2 gap-2"
		// 3 or more images use 2-column grid
		return "grid max-w-2xl grid-cols-2 gap-2"
	}

	return (
		<div className="mt-2 flex flex-col gap-2">
			{/* Images in Discord-style grid */}
			{images.length > 0 && (
				<div className={getImageGridClass(images.length)}>
					{images.map((attachment) => (
						<AttachmentItem key={attachment.id} attachment={attachment} />
					))}
				</div>
			)}

			{/* Videos separately */}
			{videos.length > 0 && (
				<div className="flex max-w-md flex-col gap-2">
					{videos.map((attachment) => (
						<AttachmentItem key={attachment.id} attachment={attachment} />
					))}
				</div>
			)}

			{/* Other files */}
			{otherFiles.length > 0 && (
				<div className="flex max-w-md flex-col gap-2">
					{otherFiles.map((attachment) => (
						<AttachmentItem key={attachment.id} attachment={attachment} />
					))}
				</div>
			)}
		</div>
	)
}
