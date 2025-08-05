import type { Editor } from "@tiptap/react"
import { useEffect, useRef, useState } from "react"

import { useChat } from "~/providers/chat-provider"
import { cx } from "~/utils/cx"
import { TextEditor } from "../base/text-editor/text-editor"
import { MessageComposerActions } from "./message-composer-actions"
import { ReplyIndicator } from "./reply-indicator"

export const MessageComposer = () => {
	const { sendMessage, startTyping, stopTyping, replyToMessageId, setReplyToMessageId } = useChat()

	const [isTyping, setIsTyping] = useState(false)

	const textareaRef = useRef<HTMLDivElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined)

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

	const handleSubmit = async (editor: Editor) => {
		sendMessage({ jsonContent: editor.getJSON(), content: editor.getText() })

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
				{replyToMessageId && (
					<ReplyIndicator
						replyToMessageId={replyToMessageId}
						onClose={() => setReplyToMessageId(null)}
					/>
				)}
				<TextEditor.Root
					className="relative w-full gap-2"
					inputClassName={cx("p-4", replyToMessageId && "rounded-t-none")}
					onSubmit={handleSubmit}
					onUpdate={handleEditorUpdate}
				>
					{(_editor) => (
						<>
							<TextEditor.Tooltip />

							<div className="relative flex flex-col gap-2">
								<TextEditor.Content className="rounded-none" ref={textareaRef} />
								<MessageComposerActions onSubmit={handleSubmit} />
							</div>
						</>
					)}
				</TextEditor.Root>
			</div>
		</div>
	)
}
