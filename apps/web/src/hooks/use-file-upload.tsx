import type { AttachmentId, OrganizationId } from "@hazel/db/schema"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { IconNotification } from "~/components/application/notifications/notifications"

export interface FileUploadProgress {
	fileId: string
	fileName: string
	fileSize: number
	progress: number
	status: "pending" | "uploading" | "complete" | "failed"
	attachmentId?: AttachmentId
	error?: string
}

interface UseFileUploadOptions {
	organizationId: OrganizationId
	onUploadComplete?: (attachmentId: AttachmentId) => void
	onUploadError?: (error: Error) => void
	maxFileSize?: number // in bytes
}

export function useFileUpload({
	organizationId,
	onUploadComplete,
	onUploadError,
	maxFileSize = 10 * 1024 * 1024, // 10MB default
}: UseFileUploadOptions) {
	const [uploads, setUploads] = useState<Map<string, FileUploadProgress>>(new Map())

	// Use the R2 component's upload hook
	const r2UploadFile = async (_any: any) => {}

	const uploadFile = useCallback(
		async (file: File): Promise<AttachmentId | null> => {
			const fileId = `${file.name}-${Date.now()}`

			// Validate file size
			if (file.size > maxFileSize) {
				const error = new Error(`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`)
				toast.custom((t) => (
					<IconNotification
						title="File too large"
						description={error.message}
						color="error"
						onClose={() => toast.dismiss(t)}
					/>
				))
				onUploadError?.(error)
				return null
			}

			// Add to uploads tracking
			setUploads((prev) => {
				const next = new Map(prev)
				next.set(fileId, {
					fileId,
					fileName: file.name,
					fileSize: file.size,
					progress: 0,
					status: "pending",
				})
				return next
			})

			try {
				// Update status to uploading
				setUploads((prev) => {
					const next = new Map(prev)
					const upload = next.get(fileId)
					if (upload) {
						upload.status = "uploading"
						upload.progress = 50 // Approximate progress
					}
					return next
				})

				// Upload file using R2 component hook
				// This returns the R2 key of the uploaded file
				const _r2Key = await r2UploadFile(file)

				// Create attachment record in database
				const attachmentId = "TODO" as AttachmentId

				// Update status to complete
				setUploads((prev) => {
					const next = new Map(prev)
					const upload = next.get(fileId)
					if (upload) {
						upload.status = "complete"
						upload.progress = 100
						upload.attachmentId = attachmentId
					}
					return next
				})

				onUploadComplete?.(attachmentId)
				return attachmentId
			} catch (error) {
				console.error("Upload failed:", error)

				// Update status to failed
				setUploads((prev) => {
					const next = new Map(prev)
					const upload = next.get(fileId)
					if (upload) {
						upload.status = "failed"
						upload.error = error instanceof Error ? error.message : "Upload failed"
					}
					return next
				})

				toast.custom((t) => (
					<IconNotification
						title="Upload failed"
						description={error instanceof Error ? error.message : "Failed to upload file"}
						color="error"
						onClose={() => toast.dismiss(t)}
					/>
				))

				onUploadError?.(error instanceof Error ? error : new Error("Upload failed"))
				return null
			}
		},
		[maxFileSize, onUploadComplete, onUploadError],
	)

	const uploadFiles = useCallback(
		async (files: FileList | File[]): Promise<AttachmentId[]> => {
			const fileArray = Array.from(files)
			const results = await Promise.all(fileArray.map(uploadFile))
			return results.filter((id): id is AttachmentId => id !== null)
		},
		[uploadFile],
	)

	const removeUpload = useCallback((fileId: string) => {
		setUploads((prev) => {
			const next = new Map(prev)
			next.delete(fileId)
			return next
		})
	}, [])

	const clearUploads = useCallback(() => {
		setUploads(new Map())
	}, [])

	const retryUpload = useCallback(
		async (fileId: string, file: File) => {
			removeUpload(fileId)
			return uploadFile(file)
		},
		[removeUpload, uploadFile],
	)

	return {
		uploadFile,
		uploadFiles,
		uploads: Array.from(uploads.values()),
		removeUpload,
		clearUploads,
		retryUpload,
		isUploading: Array.from(uploads.values()).some((u) => u.status === "uploading"),
	}
}
