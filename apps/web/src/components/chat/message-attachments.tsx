import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { FileIcon } from "@untitledui/file-icons"
import { Download01, File04, ImageIndentLeft } from "@untitledui/icons"
import { useState } from "react"
import { Button } from "react-aria-components"
import { cx } from "~/utils/cx"
import { ButtonUtility } from "../base/buttons/button-utility"

interface Attachment {
	_id: Id<"attachments">
	fileName: string
	fileSize: number
	mimeType: string
	status: string
}

interface MessageAttachmentsProps {
	attachments: Attachment[]
	organizationId: Id<"organizations">
}

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const getFileType = (mimeType: string): string => {
	const typeMap: Record<string, string> = {
		"application/pdf": "pdf",
		"image/jpeg": "jpg",
		"image/jpg": "jpg",
		"image/png": "png",
		"image/gif": "gif",
		"image/webp": "webp",
		"image/svg+xml": "svg",
		"video/mp4": "mp4",
		"video/webm": "webm",
		"audio/mpeg": "mp3",
		"audio/wav": "wav",
		"text/plain": "txt",
		"text/csv": "csv",
		"application/msword": "doc",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
		"application/vnd.ms-excel": "xls",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
	}
	return typeMap[mimeType] || "file"
}

interface AttachmentItemProps {
	attachment: Attachment
	organizationId: Id<"organizations">
}

function AttachmentItem({ attachment, organizationId }: AttachmentItemProps) {
	const [imageError, setImageError] = useState(false)
	const isImage = attachment.mimeType.startsWith("image/")
	const isVideo = attachment.mimeType.startsWith("video/")
	const fileType = getFileType(attachment.mimeType)

	// Get file URL
	const { data: fileData, isLoading } = useQuery(
		convexQuery(api.uploads.getFileUrl, {
			attachmentId: attachment._id,
			organizationId,
		}),
	)

	const handleDownload = async () => {
		if (!fileData?.url) return

		try {
			const response = await fetch(fileData.url)
			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = attachment.fileName
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
		} catch (error) {
			console.error("Download failed:", error)
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center gap-3 p-3 bg-secondary rounded-lg animate-pulse">
				<div className="size-10 bg-tertiary rounded" />
				<div className="flex-1">
					<div className="h-4 bg-tertiary rounded w-32 mb-1" />
					<div className="h-3 bg-quaternary rounded w-20" />
				</div>
			</div>
		)
	}

	// Image attachments
	if (isImage && fileData?.url && !imageError) {
		return (
			<div className="relative group">
				<img
					src={fileData.url}
					alt={attachment.fileName}
					className="rounded-lg max-w-sm max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
					onError={() => setImageError(true)}
					onClick={() => window.open(fileData.url, "_blank")}
				/>
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<ButtonUtility
						icon={Download01}
						size="sm"
						color="secondary"
						onClick={handleDownload}
						tooltip="Download"
					/>
				</div>
			</div>
		)
	}

	// Video attachments
	if (isVideo && fileData?.url) {
		return (
			<div className="relative group">
				<video
					src={fileData.url}
					controls
					className="rounded-lg max-w-sm max-h-64"
					preload="metadata"
				>
					Your browser does not support the video tag.
				</video>
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<ButtonUtility
						icon={Download01}
						size="sm"
						color="secondary"
						onClick={handleDownload}
						tooltip="Download"
					/>
				</div>
			</div>
		)
	}

	// Other file types
	return (
		<div className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-tertiary transition-colors group">
			<FileIcon
				type={fileType as any}
				theme="light"
				variant="default"
				className="size-10 shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-secondary truncate">{attachment.fileName}</p>
				<p className="text-xs text-tertiary">{formatFileSize(attachment.fileSize)}</p>
			</div>
			<ButtonUtility
				icon={Download01}
				size="sm"
				color="tertiary"
				onClick={handleDownload}
				tooltip="Download"
				className="opacity-0 group-hover:opacity-100 transition-opacity"
			/>
		</div>
	)
}

export function MessageAttachments({ attachments, organizationId }: MessageAttachmentsProps) {
	if (!attachments || attachments.length === 0) {
		return null
	}

	const images = attachments.filter((a) => a.mimeType.startsWith("image/"))
	const videos = attachments.filter((a) => a.mimeType.startsWith("video/"))
	const files = attachments.filter(
		(a) => !a.mimeType.startsWith("image/") && !a.mimeType.startsWith("video/"),
	)

	return (
		<div className="mt-2 space-y-2">
			{/* Images in a grid */}
			{images.length > 0 && (
				<div
					className={cx(
						"grid gap-2",
						images.length === 1 && "grid-cols-1",
						images.length === 2 && "grid-cols-2",
						images.length >= 3 && "grid-cols-3 max-w-lg",
					)}
				>
					{images.map((attachment) => (
						<AttachmentItem
							key={attachment._id}
							attachment={attachment}
							organizationId={organizationId}
						/>
					))}
				</div>
			)}

			{/* Videos */}
			{videos.length > 0 && (
				<div className="space-y-2">
					{videos.map((attachment) => (
						<AttachmentItem
							key={attachment._id}
							attachment={attachment}
							organizationId={organizationId}
						/>
					))}
				</div>
			)}

			{/* Other files */}
			{files.length > 0 && (
				<div className="space-y-2 max-w-sm">
					{files.map((attachment) => (
						<AttachmentItem
							key={attachment._id}
							attachment={attachment}
							organizationId={organizationId}
						/>
					))}
				</div>
			)}
		</div>
	)
}