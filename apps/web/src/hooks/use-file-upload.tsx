import { convexMutation } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useMutation } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { IconNotification } from "~/components/application/notifications/notifications"

export interface FileUploadProgress {
	fileId: string
	fileName: string
	fileSize: number
	progress: number
	status: "pending" | "uploading" | "complete" | "failed"
	attachmentId?: Id<"attachments">
	error?: string
}

interface UseFileUploadOptions {
	organizationId: Id<"organizations">
	onUploadComplete?: (attachmentId: Id<"attachments">) => void
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

	const generateUploadUrlMutation = useMutation(
		convexMutation(api.uploads.generateUploadUrl),
	)

	const completeUploadMutation = useMutation(
		convexMutation(api.uploads.completeUpload),
	)

	const uploadFile = useCallback(
		async (file: File): Promise<Id<"attachments"> | null> => {
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
						upload.progress = 10
					}
					return next
				})

				// Generate upload URL
				const { attachmentId, uploadUrl } = await generateUploadUrlMutation.mutateAsync({
					organizationId,
					fileName: file.name,
					fileSize: file.size,
					mimeType: file.type || "application/octet-stream",
				})

				// Update progress
				setUploads((prev) => {
					const next = new Map(prev)
					const upload = next.get(fileId)
					if (upload) {
						upload.progress = 30
						upload.attachmentId = attachmentId
					}
					return next
				})

				// Upload file to R2
				const xhr = new XMLHttpRequest()

				// Track upload progress
				xhr.upload.addEventListener("progress", (event) => {
					if (event.lengthComputable) {
						const percentComplete = Math.round((event.loaded / event.total) * 70) + 30
						setUploads((prev) => {
							const next = new Map(prev)
							const upload = next.get(fileId)
							if (upload) {
								upload.progress = percentComplete
							}
							return next
						})
					}
				})

				// Wrap XHR in a Promise
				const uploadPromise = new Promise<void>((resolve, reject) => {
					xhr.onload = () => {
						if (xhr.status >= 200 && xhr.status < 300) {
							resolve()
						} else {
							reject(new Error(`Upload failed with status ${xhr.status}`))
						}
					}
					xhr.onerror = () => reject(new Error("Network error during upload"))
					xhr.onabort = () => reject(new Error("Upload aborted"))
				})

				xhr.open("PUT", uploadUrl)
				xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
				xhr.send(file)

				await uploadPromise

				// Mark upload as complete in backend
				await completeUploadMutation.mutateAsync({
					attachmentId,
					organizationId,
				})

				// Update status to complete
				setUploads((prev) => {
					const next = new Map(prev)
					const upload = next.get(fileId)
					if (upload) {
						upload.status = "complete"
						upload.progress = 100
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
		[organizationId, maxFileSize, generateUploadUrlMutation, completeUploadMutation, onUploadComplete, onUploadError],
	)

	const uploadFiles = useCallback(
		async (files: FileList | File[]): Promise<Id<"attachments">[]> => {
			const fileArray = Array.from(files)
			const results = await Promise.all(fileArray.map(uploadFile))
			return results.filter((id): id is Id<"attachments"> => id !== null)
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