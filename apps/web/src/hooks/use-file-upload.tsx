import { useAtomSet } from "@effect-atom/atom-react"
import type { AttachmentId, ChannelId, OrganizationId } from "@hazel/db/schema"
import { AttachmentId as AttachmentIdSchema } from "@hazel/db/schema"
import { type Cause, Exit } from "effect"
import { useCallback } from "react"
import { toast } from "sonner"
import { IconNotification } from "~/components/application/notifications/notifications"
import { attachmentCollection } from "~/db/collections"
import { useAuth } from "~/lib/auth"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { toastExit } from "~/lib/toast-exit"

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
	onUploadError?: (errorMessage: string | Cause.Cause<any>) => void
	maxFileSize?: number
}

export function useFileUpload({
	organizationId,
	channelId,
	onUploadComplete,
	onUploadError,
	maxFileSize = 10 * 1024 * 1024,
}: UseFileUploadOptions) {
	const { user } = useAuth()

	const uploadFileMutation = useAtomSet(HazelApiClient.mutation("attachments", "upload"), {
		mode: "promiseExit",
	})

	const deleteFile = useAtomSet(HazelApiClient.mutation("attachments", "upload"), {
		mode: "promiseExit",
	})

	const uploadFile = useCallback(
		async (file: File) => {
			if (!user?.id) {
				onUploadError?.("User not authenticated")
				return null
			}

			if (file.size > maxFileSize) {
				toast.custom((t) => (
					<IconNotification
						title="File too large"
						description={`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`}
						color="error"
						onClose={() => toast.dismiss(t)}
					/>
				))

				onUploadError?.(`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`)
				return null
			}

			const attachmentId = AttachmentIdSchema.make(crypto.randomUUID())

			const formData = new FormData()
			formData.append("file", file, file.name)
			formData.append("organizationId", organizationId)
			formData.append("channelId", channelId)

			const res = await toastExit(
				uploadFileMutation({
					payload: formData,
				}),
				{
					loading: "Uploading file...",
					success: (result) => `${result.data.fileName} uploaded successfully`,
					error: "Failed to upload file",
				},
			)

			if (Exit.isSuccess(res)) {
				onUploadComplete?.(res.value.data.id)
			}

			if (Exit.isFailure(res)) {
				onUploadError?.(res.cause)
			}

			onUploadComplete?.(attachmentId)
			return res
		},
		[
			maxFileSize,
			onUploadComplete,
			onUploadError,
			organizationId,
			channelId,
			user?.id,
			uploadFileMutation,
		],
	)

	const removeUpload = useCallback((attachmentId: AttachmentId) => {
		attachmentCollection.delete(attachmentId)
	}, [])

	return {
		uploadFile,
		removeUpload,
		deleteFile,
	}
}
