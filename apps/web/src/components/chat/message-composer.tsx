import type { Editor } from "@tiptap/react"
import type { Id } from "@hazel/backend"
import { useEffect, useImperativeHandle, useRef, useState } from "react"

import { useChat } from "~/providers/chat-provider"
import { cx } from "~/utils/cx"
import { TextEditor } from "../base/text-editor/text-editor"
import { MessageComposerActions } from "./message-composer-actions"
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
	const { sendMessage, startTyping, stopTyping, replyToMessageId, setReplyToMessageId } = useChat()
	const editorRef = useRef<Editor | null>(null)

	const [isTyping, setIsTyping] = useState(false)

	const textareaRef = useRef<HTMLDivElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined)

	useImperativeHandle(
		ref,
		() => ({
			focusAndInsertText: (text: string) => {
				if (editorRef.current) {
					editorRef.current.chain().focus().insertContent(text).run()
				}
			},
		}),
		[],
	)

	const handleEditorUpdate = (editor: Editor) => {
		const content = editor.getText().trim()

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

	const handleSubmit = async (editor: Editor, attachmentIds: Id<"attachments">[] = []) => {
		sendMessage({ 
			jsonContent: editor.getJSON(), 
			content: editor.getText(),
			attachments: attachmentIds
		})

		if (isTyping) {
			setIsTyping(false)
			stopTyping()
		}
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}

		textareaRef.current?.focus()
		editor.commands.clearContent()
	}

	return (
		<div className={"relative flex h-max items-center gap-3"}>
			<div className="w-full">
				{/* Container for reply indicator and attachment preview */}
				{(replyToMessageId || attachmentIds.length > 0) && (
					<div className="rounded-t-lg border border-primary border-b-0 bg-secondary">
						{replyToMessageId && (
							<div className="flex items-center justify-between gap-2 px-3 py-2">
								<ReplyIndicator
									replyToMessageId={replyToMessageId}
									onClose={() => setReplyToMessageId(null)}
								/>
							</div>
						)}
						{attachmentIds.length > 0 && (
							<div className={cx("px-3 py-2", replyToMessageId && "border-primary border-t")}>
								<div className="flex flex-wrap gap-2">
									{attachmentIds.map((attachmentId) => {
										// First try to get the file name from uploads (for files being uploaded)
										const upload = uploads.find((u) => u.attachmentId === attachmentId)
										// Then try to get it from the attachments query (for completed uploads)
										const attachment = attachments?.find((a) => a?.id === attachmentId)
										const fileName = upload?.fileName || attachment?.fileName || "File"
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
					</div>
				)}
				<TextEditor.Root
					className="relative w-full gap-2"
					inputClassName={cx(
						"p-4",
						(replyToMessageId || attachmentIds.length > 0) && "rounded-t-none",
					)}
					onSubmit={handleSubmit}
					onUpdate={handleEditorUpdate}
				>
					{(editor) => {
						editorRef.current = editor
						return (
							<>
								<TextEditor.Tooltip />

								<div className="relative flex flex-col gap-2">
									<TextEditor.Content className="rounded-none" ref={textareaRef} />
									<MessageComposerActions onSubmit={handleSubmit} />
								</div>
							</>
						)
					}}
				</TextEditor.Root>
			</div>
		</div>
	)
}
