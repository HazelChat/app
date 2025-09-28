import type { AttachmentId, ChannelId, OrganizationId } from "@hazel/db/schema"
import { AttachmentId as AttachmentIdSchema, UserId } from "@hazel/db/schema"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { v4 as uuid } from "uuid"
import { IconNotification } from "~/components/application/notifications/notifications"
import { uploadAttachment } from "~/db/actions"
import { useAuth } from "~/providers/auth-provider"

export interface FileUploadProgress {
	fileId: string
	fileName: string
	fileSize: number
	progress: number
	status: "pending" | "uploading" | "complete" | "failed"
	attachmentId?: AttachmentId
	error?: string
	file?: File
}

interface UseFileUploadOptions {
	organizationId: OrganizationId
	channelId: ChannelId
	onUploadComplete?: (attachmentId: AttachmentId) => void
	onUploadError?: (error: Error) => void
	maxFileSize?: number // in bytes
}

export function useFileUpload({
	organizationId,
	channelId,
	onUploadComplete,
	onUploadError,
	maxFileSize = 10 * 1024 * 1024, // 10MB default
}: UseFileUploadOptions) {
	const [uploads, setUploads] = useState<Map<string, FileUploadProgress>>(new Map())
	const { user } = useAuth()

	const uploadFile = useCallback(
		async (file: File): Promise<AttachmentId | null> => {
			if (!user?.id) {
				const error = new Error("User not authenticated")
				onUploadError?.(error)
				return null
			}

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
					file: file,
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
						upload.progress = 25
					}
					return next
				})

				// Generate attachment ID
				const attachmentId = AttachmentIdSchema.make(uuid())

				// Use the uploadAttachment action
				await uploadAttachment({
					organizationId,
					file,
					channelId: channelId,
					userId: UserId.make(user.id),
					attachmentId,
				})

				// Update progress after upload
				setUploads((prev) => {
					const next = new Map(prev)
					const upload = next.get(fileId)
					if (upload) {
						upload.progress = 75
					}
					return next
				})

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
		[maxFileSize, onUploadComplete, onUploadError, organizationId, channelId, user?.id],
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
