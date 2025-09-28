import type { AttachmentId, OrganizationId } from "@hazel/db/schema"
import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { Attachment01, XClose } from "@untitledui/icons"
import { useMemo, useRef, useState } from "react"
import { attachmentCollection, channelMemberCollection } from "~/db/collections"
import { useFileUpload } from "~/hooks/use-file-upload"
import { useTyping } from "~/hooks/use-typing"
import { useAuth } from "~/providers/auth-provider"
import { useChat } from "~/providers/chat-provider"
import { cx } from "~/utils/cx"
import { ButtonUtility } from "../base/buttons/button-utility"
import { MarkdownEditor, type MarkdownEditorRef } from "../markdown-editor"
import { FileUploadPreview } from "./file-upload-preview"
import { ReplyIndicator } from "./reply-indicator"

interface MessageComposerProps {
	placeholder?: string
}

export const MessageComposer = ({ placeholder = "Type a message..." }: MessageComposerProps) => {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const { user } = useAuth()
	const { sendMessage, replyToMessageId, setReplyToMessageId, channelId } = useChat()
	const editorRef = useRef<MarkdownEditorRef | null>(null)

	const { login } = useAuth()

	const [attachmentIds, setAttachmentIds] = useState<AttachmentId[]>([])

	// Get current user's channel member
	const { data: channelMembersData } = useLiveQuery(
		(q) =>
			q
				.from({ member: channelMemberCollection })
				.where(({ member }) =>
					and(eq(member.channelId, channelId), eq(member.userId, user?.id || "")),
				)
				.orderBy(({ member }) => member.createdAt, "desc")
				.limit(1),
		[channelId, user?.id],
	)

	const currentChannelMember = useMemo(() => {
		return channelMembersData?.[0] || null
	}, [channelMembersData])

	// Use the new typing hook
	const { handleContentChange, stopTyping } = useTyping({
		channelId,
		memberId: currentChannelMember?.id || null,
	})

	const { uploads, uploadFiles, removeUpload, retryUpload } = useFileUpload({
		organizationId: orgId as OrganizationId,
		channelId: channelId,
		onUploadComplete: (attachmentId) => {
			setAttachmentIds((prev) => [...prev, attachmentId])
		},
	})

	const { data: attachments } = useLiveQuery(
		(q) =>
			q
				.from({
					attachments: attachmentCollection,
				})
				.where(({ attachments }) => inArray(attachments.id, attachmentIds))
				.select(({ attachments }) => ({
					...attachments,
					fileName: attachments.fileName,
				})),
		[orgId],
	)

	const handleRemoveAttachment = (attachmentId: AttachmentId) => {
		setAttachmentIds(attachmentIds.filter((id) => id !== attachmentId))
	}

	const handleEditorUpdate = (content: string) => {
		handleContentChange(content)
	}

	const handleSubmit = async (content: string) => {
		sendMessage({
			content,
			attachments: attachmentIds,
		})

		// Stop typing when message is sent
		stopTyping()
		setAttachmentIds([])
	}

	return (
		<div className={"relative flex h-max items-center gap-3"}>
			<div className="w-full">
				{/* Container for reply indicator and attachment preview */}

				{replyToMessageId && (
					<ReplyIndicator
						replyToMessageId={replyToMessageId}
						onClose={() => setReplyToMessageId(null)}
					/>
				)}

				{/* File Upload Previews */}
				{uploads.length > 0 && (
					<div
						className={cx(
							"rounded-t-md border border-primary px-3 py-3",
							replyToMessageId && "rounded-none border-primary border-x border-t",
						)}
					>
						<FileUploadPreview uploads={uploads} onRemove={removeUpload} onRetry={retryUpload} />
					</div>
				)}

				{/* Completed Attachments */}
				{attachmentIds.length > 0 && uploads.length === 0 && (
					<div
						className={cx(
							"rounded-t-md border border-primary px-3 py-2",
							replyToMessageId && "rounded-none border-primary border-x border-t",
						)}
					>
						<div className="flex flex-wrap gap-2">
							{attachmentIds.map((attachmentId) => {
								const attachment = attachments?.find((a) => a?.id === attachmentId)
								const fileName = attachment?.fileName || "File"

								return (
									<div
										key={attachmentId}
										className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1"
									>
										<Attachment01 className="size-3 text-fg-quaternary" />
										<span className="text-secondary text-xs">{fileName}</span>
										<ButtonUtility
											icon={XClose}
											size="xs"
											color="tertiary"
											onClick={() => handleRemoveAttachment(attachmentId)}
										/>
									</div>
								)
							})}
						</div>
					</div>
				)}
				<MarkdownEditor
					ref={editorRef}
					placeholder={placeholder}
					className={cx(
						"w-full",
						(replyToMessageId || uploads.length > 0 || attachmentIds.length > 0) &&
							"rounded-t-none",
					)}
					onSubmit={handleSubmit}
					onUpdate={handleEditorUpdate}
					attachmentIds={attachmentIds}
					setAttachmentIds={setAttachmentIds}
					uploads={uploads}
				/>
			</div>
		</div>
	)
}
