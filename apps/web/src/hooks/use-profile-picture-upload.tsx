import { useAtomRefresh, useAtomSet } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/schema"
import { Exit } from "effect"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { updateUserAction } from "~/db/actions"
import { currentUserQueryAtom, useAuth } from "~/lib/auth"
import { HazelApiClient } from "~/lib/services/common/atom-client"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function useProfilePictureUpload() {
	const { user } = useAuth()
	const [isUploading, setIsUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const refreshCurrentUser = useAtomRefresh(currentUserQueryAtom)

	const getUploadUrlMutation = useAtomSet(HazelApiClient.mutation("avatars", "getUploadUrl"), {
		mode: "promiseExit",
	})
	const updateUserMutation = useAtomSet(updateUserAction, { mode: "promiseExit" })

	const uploadToR2 = useCallback(
		(
			url: string,
			file: File,
		): Promise<{ success: boolean; errorType?: "network" | "timeout" | "server" }> => {
			return new Promise((resolve) => {
				const xhr = new XMLHttpRequest()
				xhr.timeout = 60000 // 60 second timeout

				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						const percent = Math.round((event.loaded / event.total) * 100)
						setUploadProgress(percent)
					}
				}

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve({ success: true })
					} else {
						resolve({ success: false, errorType: "server" })
					}
				}
				xhr.onerror = () => resolve({ success: false, errorType: "network" })
				xhr.ontimeout = () => resolve({ success: false, errorType: "timeout" })

				xhr.open("PUT", url)
				xhr.setRequestHeader("Content-Type", file.type)
				xhr.send(file)
			})
		},
		[],
	)

	const uploadProfilePicture = useCallback(
		async (file: File): Promise<string | null> => {
			if (!user?.id) {
				toast.error("Authentication required", {
					description: "You must be logged in to upload a profile picture",
				})
				return null
			}

			// Validate file type
			if (!ALLOWED_TYPES.includes(file.type)) {
				toast.error("Invalid file type", {
					description: "Please select a JPEG, PNG, or WebP image",
				})
				return null
			}

			// Validate file size
			if (file.size > MAX_FILE_SIZE) {
				toast.error("File too large", {
					description: "Image must be less than 5MB",
				})
				return null
			}

			setIsUploading(true)

			try {
				// Step 1: Get presigned URL from backend
				const urlRes = await getUploadUrlMutation({
					payload: {
						contentType: file.type,
						fileSize: file.size,
					},
				})

				if (!Exit.isSuccess(urlRes)) {
					toast.error("Upload failed", {
						description: "Failed to get upload URL. Please try again.",
					})
					return null
				}

				const { uploadUrl, key } = urlRes.value

				// Step 2: Upload file directly to R2 using XHR (for progress tracking)
				const uploadResult = await uploadToR2(uploadUrl, file)

				if (!uploadResult.success) {
					const errorMessages = {
						network: "Network error. Check your connection and try again.",
						timeout: "Upload timed out. Try a smaller image or check your connection.",
						server: "Server error during upload. Please try again later.",
					}
					toast.error("Upload failed", {
						description: errorMessages[uploadResult.errorType ?? "server"],
					})
					return null
				}

				// Step 3: Construct public URL and update user's avatarUrl
				const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL
				if (!r2PublicUrl) {
					console.error("VITE_R2_PUBLIC_URL environment variable is not set")
					toast.error("Configuration error", {
						description: "Image upload is not configured. Please contact support.",
					})
					return null
				}
				const publicUrl = `${r2PublicUrl}/${key}`

				const result = await updateUserMutation({
					userId: user.id as UserId,
					avatarUrl: publicUrl,
				})

				if (!Exit.isSuccess(result)) {
					toast.error("Upload failed", {
						description: "Failed to update profile. Please try again.",
					})
					return null
				}

				// Refresh the current user query to update UI immediately
				refreshCurrentUser()

				toast.success("Profile picture updated")
				return publicUrl
			} catch (error) {
				console.error("Profile picture upload error:", error)
				toast.error("Upload failed", {
					description: "An unexpected error occurred. Please try again.",
				})
				return null
			} finally {
				setIsUploading(false)
				setUploadProgress(0)
			}
		},
		[user?.id, getUploadUrlMutation, updateUserMutation, refreshCurrentUser, uploadToR2],
	)

	return {
		uploadProfilePicture,
		isUploading,
		uploadProgress,
	}
}
