import { and, eq, inArray, useLiveQuery } from "@tanstack/react-db"
import { FileIcon } from "@untitledui/file-icons"
import { useMemo, useRef } from "react"
import IconClose from "~/components/icons/icon-close"
import { Button } from "~/components/ui/button"
import { Loader } from "~/components/ui/loader"
import { attachmentCollection, channelMemberCollection } from "~/db/collections"
import { useTyping } from "~/hooks/use-typing"
import { useAuth } from "~/lib/auth"
import { cn } from "~/lib/utils"
import { useChat } from "~/providers/chat-provider"
import { formatFileSize, getFileTypeFromName } from "~/utils/file-utils"
import { MessageComposerActions } from "../message-composer-actions"
import { ReplyIndicator } from "../reply-indicator"
import { SlateMessageEditor, type SlateMessageEditorRef } from "./slate-message-editor"

interface SlateMessageComposerProps {
	placeholder?: string
}

export const SlateMessageComposer = ({ placeholder = "Type a message..." }: SlateMessageComposerProps) => {
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

	const editorRef = useRef<SlateMessageEditorRef>(null)

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

	const handleUpdate = (content: string) => {
		handleContentChange(content)
	}

	const handleSubmit = async (content: string) => {
		if (!content.trim()) return

		sendMessage({
			content: content.trim(),
		})
		stopTyping()

		// Clear editor
		editorRef.current?.clearContent()
	}

	const handleEmojiSelect = (emoji: string) => {
		editorRef.current?.focusAndInsertText(emoji)
	}

	return (
		<div className="relative flex h-max items-center gap-3">
			<div className="w-full">
				{/* Completed Attachments */}
				{(attachmentIds.length > 0 || uploadingFiles.length > 0) && (
					<div
						className={cn(
							"border border-border border-b-0 bg-secondary px-2 py-1",
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
										className="group flex items-center gap-2 rounded-lg bg-bg p-2 transition-colors hover:bg-secondary"
									>
										<FileIcon type={fileType} className="size-8 shrink-0 text-muted-fg" />
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-fg text-sm">
												{fileName}
											</div>
											<div className="text-muted-fg text-xs">
												{formatFileSize(fileSize)}
											</div>
										</div>
										<Button
											intent="plain"
											size="sq-xs"
											onPress={() => removeAttachment(attachmentId)}
										>
											<IconClose data-slot="icon" />
										</Button>
									</div>
								)
							})}

							{uploadingFiles.map((file: any) => {
								const fileType = getFileTypeFromName(file.fileName)

								return (
									<div
										key={file.fileId}
										className="group flex items-center gap-2 rounded-lg bg-bg p-2 transition-colors hover:bg-secondary"
									>
										<FileIcon type={fileType} className="size-8 shrink-0 text-muted-fg" />
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium text-fg text-sm">
												{file.fileName}
											</div>
											<div className="text-muted-fg text-xs">
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

				{/* Editor container with actions */}
				<div
					className={cn(
						"relative inset-ring inset-ring-secondary flex h-max flex-col rounded-xl bg-secondary",
						(replyToMessageId || attachmentIds.length > 0 || uploadingFiles.length > 0) &&
							"rounded-t-none",
					)}
				>
					<SlateMessageEditor
						ref={editorRef}
						placeholder={placeholder}
						className="w-full"
						onSubmit={handleSubmit}
						onUpdate={handleUpdate}
						isUploading={isUploading}
					/>
					<MessageComposerActions onEmojiSelect={handleEmojiSelect} />
				</div>
			</div>
		</div>
	)
}
