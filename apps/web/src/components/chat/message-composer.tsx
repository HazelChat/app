import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { FileIcon } from "@untitledui/file-icons"
import { RefreshCcw02, XClose } from "@untitledui/icons"
import { useMemo, useRef } from "react"
import { attachmentCollection, channelMemberCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useTyping } from "~/hooks/use-typing"
import { useAuth } from "~/lib/auth"
import { useChat } from "~/providers/chat-provider"
import { cx } from "~/utils/cx"
import { formatFileSize, getFileTypeFromName } from "~/utils/file-utils"
import { ButtonUtility } from "../base/buttons/button-utility"
import { MarkdownEditor, type MarkdownEditorRef } from "../markdown-editor"
import { Loader } from "../ui/loader"
import { ReplyIndicator } from "./reply-indicator"

interface MessageComposerProps {
	placeholder?: string
}

export const MessageComposer = ({ placeholder = "Type a message..." }: MessageComposerProps) => {
	const { user } = useAuth()
	const {
		sendMessage,
		replyToMessageId,
		setReplyToMessageId,
		channelId,
		attachmentIds,
		removeAttachment,
		isUploading,
		uploadingFiles,
	} = useChat()

	const editorRef = useRef<MarkdownEditorRef | null>(null)

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

	const { handleContentChange, stopTyping } = useTyping({
		channelId,
		memberId: currentChannelMember?.id || null,
	})

	const { data: attachments } = useLiveQuery(
		(q) =>
			q
				.from({
					attachments: attachmentCollection,
				})
				.where(({ attachments }) => inArray(attachments.id, attachmentIds)),
		[attachmentIds],
	)

	const handleEditorUpdate = (content: string) => {
		handleContentChange(content)
	}

	const handleSubmit = async (content: string) => {
		sendMessage({
			content,
		})

		stopTyping()
	}

	return (
		<div className={"relative flex h-max items-center gap-3"}>
			<div className="w-full">
				{/* Completed Attachments */}
				{(attachmentIds.length > 0 || uploadingFiles.length > 0) && (
					<div
						className={cx(
							"border border-secondary border-b-0 bg-secondary px-2 py-1",
							uploadingFiles.length > 0 ? "rounded-t-none border-t-0" : "rounded-t-lg",
							replyToMessageId && "border-b-0",
						)}
					>
						<div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4">
							{attachmentIds.map((attachmentId) => {
								const attachment = attachments?.find((a) => a?.id === attachmentId)
								const fileName = attachment?.fileName || "File"
								const fileSize = attachment?.fileSize || 0
								const fileType = getFileTypeFromName(fileName)

								return (
									<div
										key={attachmentId}
										className="group flex items-center gap-2 rounded-lg bg-primary p-2 transition-colors hover:bg-tertiary"
									>
										<FileIcon
											type={fileType}
											className="size-8 shrink-0 text-fg-quaternary"
										/>
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-secondary text-sm">
												{fileName}
											</div>
											<div className="text-quaternary text-xs">
												{formatFileSize(fileSize)}
											</div>
										</div>
										<ButtonUtility
											icon={XClose}
											size="xs"
											color="tertiary"
											onClick={() => removeAttachment(attachmentId)}
										/>
									</div>
								)
							})}

							{uploadingFiles.map((file) => {
								const fileType = getFileTypeFromName(file.fileName)

								return (
									<div
										key={file.fileId}
										className="group flex items-center gap-2 rounded-lg bg-primary p-2 transition-colors hover:bg-tertiary"
									>
										<FileIcon
											type={fileType}
											className="size-8 shrink-0 text-fg-quaternary"
										/>
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-secondary text-sm">
												{file.fileName}
											</div>
											<div className="text-quaternary text-xs">
												{formatFileSize(file.fileSize)}
											</div>
										</div>
										<Loader className="size-4" />
									</div>
								)
							})}
						</div>
					</div>
				)}

				{/* Container for reply indicator and attachment preview */}
				{replyToMessageId && (
					<ReplyIndicator
						className={
							uploadingFiles.length > 0 || attachmentIds.length > 0
								? "rounded-t-none border-t-0"
								: ""
						}
						replyToMessageId={replyToMessageId}
						onClose={() => setReplyToMessageId(null)}
					/>
				)}
				<MarkdownEditor
					ref={editorRef}
					placeholder={placeholder}
					className={cx(
						"w-full",
						(replyToMessageId || attachmentIds.length > 0 || uploadingFiles.length > 0) &&
							"rounded-t-none",
					)}
					onSubmit={handleSubmit}
					onUpdate={handleEditorUpdate}
					isUploading={isUploading}
				/>
			</div>
		</div>
	)
}
