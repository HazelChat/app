import { FileIcon } from "@untitledui/file-icons"
import { AlertCircle, FileCheck02, RefreshCw01, XClose } from "@untitledui/icons"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import type { FileUploadProgress } from "~/hooks/use-file-upload"
import { cx } from "~/utils/cx"
import { ButtonUtility } from "../base/buttons/button-utility"

interface FileUploadPreviewProps {
	uploads: FileUploadProgress[]
	onRemove: (fileId: string) => void
	onRetry?: (fileId: string, file: File) => void
	className?: string
}

const getFileType = (fileName: string): string => {
	const extension = fileName.split(".").pop()?.toLowerCase() || ""
	const fileTypes: Record<string, string> = {
		pdf: "pdf",
		doc: "doc",
		docx: "doc",
		xls: "xls",
		xlsx: "xls",
		ppt: "ppt",
		pptx: "ppt",
		txt: "txt",
		csv: "csv",
		zip: "zip",
		rar: "zip",
		"7z": "zip",
		mp3: "audio",
		wav: "audio",
		mp4: "video",
		avi: "video",
		mov: "video",
		jpg: "img",
		jpeg: "img",
		png: "img",
		gif: "img",
		svg: "img",
		webp: "img",
	}
	return fileTypes[extension] || "empty"
}

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`
}

interface FilePreviewItemProps {
	upload: FileUploadProgress
	onRemove: () => void
	onRetry?: () => void
}

const FilePreviewItem = ({ upload, onRemove, onRetry }: FilePreviewItemProps) => {
	const [imagePreview, setImagePreview] = useState<string | null>(null)
	const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(upload.fileName)
	const fileType = getFileType(upload.fileName)

	useEffect(() => {
		if (isImage && upload.file instanceof File) {
			const reader = new FileReader()
			reader.onload = (e) => {
				setImagePreview(e.target?.result as string)
			}
			reader.readAsDataURL(upload.file)
		}
	}, [isImage, upload.file])

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95, y: 10 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95, y: -10 }}
			transition={{ duration: 0.2 }}
			className={cx(
				"relative flex items-start gap-3 rounded-lg p-3",
				"inset-ring inset-ring-secondary bg-primary",
				"transition-all duration-200",
				upload.status === "failed" && "ring-2 ring-error",
				upload.status === "uploading" && "bg-secondary/30",
			)}
		>
			{/* File Preview/Icon */}
			<div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-secondary/50">
				{isImage && imagePreview ? (
					<img src={imagePreview} alt={upload.fileName} className="size-full object-cover" />
				) : (
					<div className="flex size-full items-center justify-center">
						<FileIcon
							type={fileType}
							theme="light"
							variant="solid"
							className="size-8 dark:hidden"
						/>
						<FileIcon
							type={fileType}
							theme="dark"
							variant="solid"
							className="not-dark:hidden size-8"
						/>
					</div>
				)}

				{/* Progress Overlay */}
				{upload.status === "uploading" && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/40">
						<div className="relative size-8">
							<svg className="-rotate-90 size-full transform">
								<circle
									cx="16"
									cy="16"
									r="14"
									stroke="currentColor"
									strokeWidth="2"
									fill="none"
									className="text-white/20"
								/>
								<circle
									cx="16"
									cy="16"
									r="14"
									stroke="currentColor"
									strokeWidth="2"
									fill="none"
									strokeDasharray={88}
									strokeDashoffset={88 - (88 * upload.progress) / 100}
									className="text-white transition-all duration-300"
								/>
							</svg>
							<span className="absolute inset-0 flex items-center justify-center font-semibold text-white text-xs">
								{upload.progress}%
							</span>
						</div>
					</div>
				)}

				{/* Status Icons */}
				{upload.status === "complete" && (
					<div className="absolute inset-0 flex items-center justify-center bg-success/20">
						<FileCheck02 className="size-5 text-success" />
					</div>
				)}
				{upload.status === "failed" && (
					<div className="absolute inset-0 flex items-center justify-center bg-error/20">
						<AlertCircle className="size-5 text-error" />
					</div>
				)}
			</div>

			{/* File Info */}
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-secondary text-sm">{upload.fileName}</p>
				<div className="mt-0.5 flex items-center gap-2 text-xs">
					<span className="text-tertiary">{formatFileSize(upload.fileSize)}</span>
					{upload.status === "uploading" && (
						<>
							<span className="text-quaternary">•</span>
							<span className="text-brand">Uploading...</span>
						</>
					)}
					{upload.status === "complete" && (
						<>
							<span className="text-quaternary">•</span>
							<span className="text-success">Complete</span>
						</>
					)}
					{upload.status === "failed" && (
						<>
							<span className="text-quaternary">•</span>
							<span className="text-error">Failed</span>
						</>
					)}
				</div>

				{/* Progress Bar */}
				{upload.status === "uploading" && (
					<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${upload.progress}%` }}
							transition={{ duration: 0.3 }}
							className="h-full bg-brand"
						/>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1">
				{upload.status === "failed" && onRetry && (
					<ButtonUtility
						icon={RefreshCw01}
						size="xs"
						color="tertiary"
						tooltip="Retry upload"
						onClick={onRetry}
					/>
				)}
				<ButtonUtility icon={XClose} size="xs" color="tertiary" tooltip="Remove" onClick={onRemove} />
			</div>
		</motion.div>
	)
}

export const FileUploadPreview = ({ uploads, onRemove, onRetry, className }: FileUploadPreviewProps) => {
	if (uploads.length === 0) return null

	return (
		<div className={cx("space-y-2", className)}>
			<AnimatePresence mode="popLayout">
				{uploads.map((upload) => (
					<FilePreviewItem
						key={upload.fileId}
						upload={upload}
						onRemove={() => onRemove(upload.fileId)}
						onRetry={
							onRetry && upload.file
								? () => onRetry(upload.fileId, upload.file as File)
								: undefined
						}
					/>
				))}
			</AnimatePresence>
		</div>
	)
}
