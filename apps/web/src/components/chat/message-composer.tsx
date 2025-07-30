import type { Editor } from "@tiptap/react"
import { Attachment01, FaceSmile, Recording02 } from "@untitledui/icons"
import { useEffect, useRef, useState } from "react"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { useChat } from "~/providers/chat-provider"
import { TextEditor, useEditorContext } from "../base/text-editor/text-editor"

export const MessageComposer = () => {
	const { sendMessage, startTyping, stopTyping } = useChat()

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
			<TextEditor.Root className="relative w-full gap-2" inputClassName="p-4" onSubmit={handleSubmit}>
				{(editor) => (
					<>
						<TextEditor.Tooltip />

						<div className="relative flex flex-col gap-2">
							<TextEditor.Content
								ref={textareaRef}
							/>
							<MessageActions onSubmit={handleSubmit} />
						</div>
					</>
				)}
			</TextEditor.Root>
		</div>
	)
}

const MessageActions = ({ onSubmit }: { onSubmit?: (editor: Editor) => Promise<void> }) => {
	const editor = useEditorContext()

	return (
		<div className="absolute right-3.5 bottom-2 flex items-center gap-2">
			<div className="flex items-center gap-0.5">
				<ButtonUtility icon={Attachment01} size="xs" color="tertiary" />
				<ButtonUtility icon={FaceSmile} size="xs" color="tertiary" />
			</div>

			<Button
				size="sm"
				color="link-color"
				onClick={async () => {
					await onSubmit?.(editor.editor)
				}}
			>
				Send
			</Button>
		</div>
	)
}
