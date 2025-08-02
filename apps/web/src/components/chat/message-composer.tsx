import type { Editor } from "@tiptap/react"
import { useRef, useState } from "react"

import { useChat } from "~/providers/chat-provider"
import { TextEditor } from "../base/text-editor/text-editor"
import { MessageComposerActions } from "./message-composer-actions"
import { ReplyIndicator } from "./reply-indicator"

export const MessageComposer = () => {
	const { sendMessage, startTyping, stopTyping, replyToMessageId, setReplyToMessageId } = useChat()

	const [isTyping, setIsTyping] = useState(false)

	const textareaRef = useRef<HTMLDivElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined)

	// useEffect(() => {
	// 	if (content && !isTyping) {
	// 		setIsTyping(true)
	// 		startTyping()
	// 	}

	// 	if (isTyping) {
	// 		if (typingTimeoutRef.current) {
	// 			clearTimeout(typingTimeoutRef.current)
	// 		}

	// 		typingTimeoutRef.current = setTimeout(() => {
	// 			setIsTyping(false)
	// 			stopTyping()
	// 		}, 3000)
	// 	}

	// 	return () => {
	// 		if (typingTimeoutRef.current) {
	// 			clearTimeout(typingTimeoutRef.current)
	// 		}
	// 	}
	// }, [content, isTyping, startTyping, stopTyping])

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
					inputClassName="p-4"
					onSubmit={handleSubmit}
				>
					{(_editor) => (
						<>
							<TextEditor.Tooltip />

							<div className="relative flex flex-col gap-2">
								<TextEditor.Content ref={textareaRef} />
								<MessageComposerActions onSubmit={handleSubmit} />
							</div>
						</>
					)}
				</TextEditor.Root>
			</div>
		</div>
	)
}
