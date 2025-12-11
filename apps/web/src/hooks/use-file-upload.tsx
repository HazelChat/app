import { useAtomSet } from "@effect-atom/atom-react"
import type { AttachmentId, ChannelId, OrganizationId } from "@hazel/schema"
import { Exit } from "effect"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "~/lib/auth"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"

interface UseFileUploadOptions {
	organizationId: OrganizationId
	channelId: ChannelId
	maxFileSize?: number
	onProgress?: (fileId: string, progress: number) => void
}

export function useFileUpload({
	organizationId,
	channelId,
	maxFileSize = 10 * 1024 * 1024,
	onProgress,
}: UseFileUploadOptions) {
	const { user } = useAuth()
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
	const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

	const getUploadUrlMutation = useAtomSet(HazelApiClient.mutation("attachments", "getUploadUrl"), {
		mode: "promiseExit",
	})

	const completeUploadMutation = useAtomSet(HazelRpcClient.mutation("attachment.complete"), {
		mode: "promiseExit",
	})

	const failUploadMutation = useAtomSet(HazelRpcClient.mutation("attachment.fail"), {
		mode: "promiseExit",
	})

	// Upload file directly to R2 using XHR (for progress tracking)
	// Returns { success: boolean, errorType?: 'network' | 'timeout' | 'server' | 'aborted' }
	const uploadToR2 = useCallback(
		(
			url: string,
			file: File,
			fileId: string,
		): Promise<{ success: boolean; errorType?: "network" | "timeout" | "server" | "aborted" }> => {
			return new Promise((resolve) => {
				const xhr = new XMLHttpRequest()
				const abortController = new AbortController()
				abortControllersRef.current.set(fileId, abortController)
				xhr.timeout = 120000 // 2 minute timeout for larger files

				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						const percent = Math.round((event.loaded / event.total) * 100)
						setUploadProgress((prev) => ({ ...prev, [fileId]: percent }))
						onProgress?.(fileId, percent)
					}
				}

				xhr.onload = () => {
					abortControllersRef.current.delete(fileId)
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve({ success: true })
					} else {
						resolve({ success: false, errorType: "server" })
					}
				}

				xhr.onerror = () => {
					abortControllersRef.current.delete(fileId)
					resolve({ success: false, errorType: "network" })
				}

				xhr.ontimeout = () => {
					abortControllersRef.current.delete(fileId)
					resolve({ success: false, errorType: "timeout" })
				}

				xhr.onabort = () => {
					abortControllersRef.current.delete(fileId)
					resolve({ success: false, errorType: "aborted" })
				}

				xhr.open("PUT", url)
				xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
				xhr.send(file)
			})
		},
		[onProgress],
	)

	const uploadFile = useCallback(
		async (file: File, fileId?: string): Promise<AttachmentId | null> => {
			const trackingId = fileId || crypto.randomUUID()

			if (!user?.id) {
				toast.error("Authentication required", {
					description: "You must be logged in to upload files",
				})
				return null
			}

			if (file.size > maxFileSize) {
				toast.error("File too large", {
					description: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit`,
				})
				return null
			}

			try {
				// Step 1: Get presigned URL from backend (creates attachment with "uploading" status)
				const urlRes = await getUploadUrlMutation({
					payload: {
						fileName: file.name,
						fileSize: file.size,
						contentType: file.type || "application/octet-stream",
						organizationId,
						channelId,
					},
				})

				if (!Exit.isSuccess(urlRes)) {
					toast.error("Upload failed", {
						description: "Failed to get upload URL. Please try again.",
					})
					return null
				}

				const { uploadUrl, attachmentId } = urlRes.value

				// Step 2: Upload file directly to R2 using XHR (for progress tracking)
				const uploadResult = await uploadToR2(uploadUrl, file, trackingId)

				if (!uploadResult.success) {
					// Don't show error for aborted uploads (user cancelled)
					if (uploadResult.errorType !== "aborted") {
						// Mark attachment as failed in the database
						await failUploadMutation({
							payload: { id: attachmentId, reason: `R2 upload failed: ${uploadResult.errorType}` },
						})
						const errorMessages = {
							network: "Network error. Check your connection and try again.",
							timeout: "Upload timed out. Try a smaller file or check your connection.",
							server: "Server error during upload. Please try again later.",
						}
						toast.error("Upload failed", {
							description: errorMessages[uploadResult.errorType ?? "server"],
						})
					} else {
						// Still mark as failed for aborted uploads
						await failUploadMutation({ payload: { id: attachmentId, reason: "Upload cancelled" } })
					}
					return null
				}

				// Step 3: Mark attachment as complete
				const completeRes = await completeUploadMutation({ payload: { id: attachmentId } })

				if (!Exit.isSuccess(completeRes)) {
					// Mark attachment as failed in the database
					await failUploadMutation({ payload: { id: attachmentId, reason: "Failed to finalize upload" } })
					toast.error("Upload failed", {
						description: "Failed to finalize upload. Please try again.",
					})
					return null
				}

				// Clear progress for this file
				setUploadProgress((prev) => {
					const next = { ...prev }
					delete next[trackingId]
					return next
				})

				return attachmentId
			} catch (error) {
				console.error("File upload error:", error)
				toast.error("Upload failed", {
					description: "An unexpected error occurred. Please try again.",
				})
				return null
			}
		},
		[
			maxFileSize,
			organizationId,
			channelId,
			user?.id,
			getUploadUrlMutation,
			completeUploadMutation,
			failUploadMutation,
			uploadToR2,
		],
	)

	const cancelUpload = useCallback((fileId: string) => {
		const controller = abortControllersRef.current.get(fileId)
		if (controller) {
			controller.abort()
		}
	}, [])

	const getProgress = useCallback(
		(fileId: string) => {
			return uploadProgress[fileId] ?? 0
		},
		[uploadProgress],
	)

	return {
		uploadFile,
		cancelUpload,
		getProgress,
		uploadProgress,
	}
}
