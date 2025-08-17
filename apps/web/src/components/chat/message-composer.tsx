import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { Attachment01, Loading03, XClose } from "@untitledui/icons"
import { useEffect, useImperativeHandle, useRef, useState } from "react"

import { useFileUpload } from "~/hooks/use-file-upload"
import { useChat } from "~/providers/chat-provider"
import { cx } from "~/utils/cx"
import { ButtonUtility } from "../base/buttons/button-utility"
import { MarkdownEditor, type MarkdownEditorRef } from "../markdown-editor"
import { ReplyIndicator } from "./reply-indicator"

export interface MessageComposerRef {
	focusAndInsertText: (text: string) => void
}

interface MessageComposerProps {
	ref?: React.Ref<MessageComposerRef>
	placeholder?: string
	channelId?: string
	organizationId?: string
}

export const MessageComposer = ({ ref, placeholder = "Type a message..." }: MessageComposerProps) => {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const { sendMessage, startTyping, stopTyping, replyToMessageId, setReplyToMessageId } = useChat()
	const editorRef = useRef<MarkdownEditorRef | null>(null)

	const [isTyping, setIsTyping] = useState(false)
	const [attachmentIds, setAttachmentIds] = useState<Id<"attachments">[]>([])
	const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

	// Expose the focusAndInsertText method to parent component
	useImperativeHandle(
		ref,
		() => ({
			focusAndInsertText: (text: string) => {
				editorRef.current?.focusAndInsertText(text)
			},
		}),
		[],
	)

	const { uploads } = useFileUpload({
		organizationId: orgId as Id<"organizations">,
		onUploadComplete: () => {},
	})

	// Fetch attachment details to get actual file names
	const { data: attachments } = useQuery(
		convexQuery(api.uploads.getAttachmentsByIds, {
			attachmentIds,
			organizationId: orgId as Id<"organizations">,
		}),
	)

	const handleRemoveAttachment = (attachmentId: Id<"attachments">) => {
		setAttachmentIds(attachmentIds.filter((id) => id !== attachmentId))
	}

	const handleEditorUpdate = (content: string) => {
		// Debug log for current user typing
		console.log("[DEBUG] User typing, content length:", content.length)

		if (content && !isTyping) {
			console.log("[DEBUG] User started typing")
			setIsTyping(true)
			startTyping()
		}

		if (content && isTyping) {
			// Reset the typing timeout
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}

			// Set a new timeout to stop typing after 3 seconds of inactivity
			typingTimeoutRef.current = setTimeout(() => {
				console.log("[DEBUG] User stopped typing due to inactivity")
				setIsTyping(false)
				stopTyping()
			}, 3000)
		}

		// If content is empty and user was typing, stop typing
		if (!content && isTyping) {
			console.log("[DEBUG] User stopped typing (empty content)")
			setIsTyping(false)
			stopTyping()
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
		}
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
			if (isTyping) {
				stopTyping()
			}
		}
	}, [isTyping, stopTyping])

	const handleSubmit = async (content: string, jsonContent: any) => {
		sendMessage({
			jsonContent,
			content,
			attachments: attachmentIds,
		})

		if (isTyping) {
			setIsTyping(false)
			stopTyping()
		}
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}

		// Clear attachments after sending
		setAttachmentIds([])

		// Note: Editor content is cleared and refocused automatically by MarkdownEditor's handleSubmit
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

				{attachmentIds.length > 0 && (
					<div
						className={cx(
							"rounded-t-md border border-primary px-3 py-2",
							replyToMessageId && "rounded-none border-primary border-x border-t",
						)}
					>
						<div className="flex flex-wrap gap-2">
							{attachmentIds.map((attachmentId) => {
								// First try to get the file name from uploads (for files being uploaded)
								const upload = uploads.find((u) => u.attachmentId === attachmentId)
								// Then try to get it from the attachments query (for completed uploads)
								const attachment = attachments?.find((a) => a?.id === attachmentId)
								const fileName = upload?.fileName || attachment?.fileName || "File"
								const isUploading =
									upload?.status === "uploading" || upload?.status === "pending"

								return (
									<div
										key={attachmentId}
										className={cx(
											"inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1",
											isUploading && "opacity-70",
										)}
									>
										{isUploading ? (
											<Loading03 className="size-3 animate-spin text-fg-quaternary" />
										) : (
											<Attachment01 className="size-3 text-fg-quaternary" />
										)}
										<span className="text-secondary text-xs">{fileName}</span>
										<ButtonUtility
											icon={XClose}
											size="xs"
											color="tertiary"
											onClick={() => handleRemoveAttachment(attachmentId)}
											disabled={isUploading}
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
						(replyToMessageId || attachmentIds.length > 0) && "[&_.editor]:rounded-t-none",
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
