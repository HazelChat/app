import { useAtomSet } from "@effect-atom/atom-react"
import type { AttachmentId, ChannelId, OrganizationId } from "@hazel/db/schema"
import { Exit } from "effect"
import { useCallback } from "react"
import { toast } from "sonner"
import { IconNotification } from "~/components/application/notifications/notifications"
import { useAuth } from "~/lib/auth"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { toastExit } from "~/lib/toast-exit"

interface UseFileUploadOptions {
	organizationId: OrganizationId
	channelId: ChannelId
	maxFileSize?: number
}

export function useFileUpload({
	organizationId,
	channelId,
	maxFileSize = 10 * 1024 * 1024,
}: UseFileUploadOptions) {
	const { user } = useAuth()

	const uploadFileMutation = useAtomSet(HazelApiClient.mutation("attachments", "upload"), {
		mode: "promiseExit",
	})

	const uploadFile = useCallback(
		async (file: File): Promise<AttachmentId | null> => {
			if (!user?.id) {
				toast.custom((t) => (
					<IconNotification
						title="Authentication required"
						description="You must be logged in to upload files"
						color="error"
						onClose={() => toast.dismiss(t)}
					/>
				))
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
				return null
			}

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
				return res.value.data.id
			}

			return null
		},
		[maxFileSize, organizationId, channelId, user?.id, uploadFileMutation],
	)

	return {
		uploadFile,
	}
}
