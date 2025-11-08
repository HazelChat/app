import type { Attachment } from "@hazel/db/models"
import type { MessageId } from "@hazel/db/schema"
import { FileIcon } from "@untitledui/file-icons"

import { useState } from "react"
import { useAttachments, useMessage } from "~/db/hooks"
import { formatFileSize, getFileTypeFromName } from "~/utils/file-utils"
import { IconDownload } from "../icons/icon-download"
import { Button } from "../ui/button"
import { ImageViewerModal, type ViewerImage } from "./image-viewer-modal"

interface MessageAttachmentsProps {
	messageId: MessageId
}

interface ImageAttachmentItemProps {
	attachment: typeof Attachment.Model.Type
	imageCount: number
	index: number
	onClick: () => void
}

function ImageAttachmentItem({ attachment, imageCount, index, onClick }: ImageAttachmentItemProps) {
	const [imageError, setImageError] = useState(false)

	if (imageError) {
		return null
	}

	const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://cdn.hazel.sh"
	const imageUrl = `${publicUrl}/${attachment.id}`

	return (
		<>
			{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
			<img
				src={imageUrl}
				alt={attachment.fileName}
				className={imageCount === 1 ? "block max-h-[300px] max-w-full" : "size-full object-cover"}
				onError={() => setImageError(true)}
				onClick={onClick}
			/>
			{imageCount > 4 && index === 3 && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
					<span className="font-semibold text-lg text-white">+{imageCount - 4}</span>
				</div>
			)}
		</>
	)
}

interface AttachmentItemProps {
	attachment: typeof Attachment.Model.Type
}

function AttachmentItem({ attachment }: AttachmentItemProps) {
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

	// Check if it's a video based on extension
	const isVideo = ["mp4", "webm"].includes(fileType)

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
							<IconDownload data-slot="icon" />
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
				<IconDownload />
			</Button>
		</div>
	)
}

export function MessageAttachments({ messageId }: MessageAttachmentsProps) {
	const { attachments } = useAttachments(messageId)
	const { data: message } = useMessage(messageId)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [selectedImageIndex, setSelectedImageIndex] = useState(0)

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

	// Get wrapper classes for each image based on count and index
	const getImageWrapperClass = (count: number, index: number) => {
		// Single image: block element spanning both columns for full width
		if (count === 1) {
			return "group relative col-span-2 block w-fit cursor-pointer overflow-hidden rounded-md border border-border transition-opacity hover:opacity-90"
		}

		const baseClasses =
			"group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-border transition-opacity hover:opacity-90"

		// 3 images: first image spans 2 columns and 2 rows
		if (count === 3 && index === 0) {
			return `${baseClasses} col-span-2 row-span-2`
		}

		return baseClasses
	}

	return (
		<div className="mt-2 flex flex-col gap-2">
			{/* Images in Discord-style grid */}
			{images.length > 0 && (
				<div className={`grid max-w-lg gap-1 ${images.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
					{images.slice(0, 4).map((attachment, index) => (
						<div key={attachment.id} className={getImageWrapperClass(images.length, index)}>
							<ImageAttachmentItem
								attachment={attachment}
								imageCount={images.length}
								index={index}
								onClick={() => {
									setSelectedImageIndex(index)
									setIsModalOpen(true)
								}}
							/>
						</div>
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

			{/* Image Viewer Modal */}
			{images.length > 0 &&
				message &&
				(() => {
					// Convert attachments to ViewerImage format
					const viewerImages: ViewerImage[] = images.map((attachment) => ({
						type: "attachment" as const,
						attachment,
					}))

					return (
						<ImageViewerModal
							isOpen={isModalOpen}
							onOpenChange={setIsModalOpen}
							images={viewerImages}
							initialIndex={selectedImageIndex}
							author={message.author}
							createdAt={message.createdAt.getTime()}
						/>
					)
				})()}
		</div>
	)
}
