import { Attachment01, FaceSmile, Recording02 } from "@untitledui/icons"
import { useEffect, useRef, useState } from "react"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { TextAreaBase } from "~/components/base/textarea/textarea"
import { useChat } from "~/providers/chat-provider"

export const MessageComposer = () => {
	const { sendMessage, startTyping, stopTyping } = useChat()

	const [content, setContent] = useState("")
	const [isTyping, setIsTyping] = useState(false)

	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined)

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto"
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 340)}px`
		}
	}, [content])

	useEffect(() => {
		if (content && !isTyping) {
			setIsTyping(true)
			startTyping()
		}

		if (isTyping) {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}

			typingTimeoutRef.current = setTimeout(() => {
				setIsTyping(false)
				stopTyping()
			}, 3000)
		}

		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
		}
	}, [content, isTyping, startTyping, stopTyping])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!content.trim()) return

		sendMessage(content.trim())
		setContent("")

		if (isTyping) {
			setIsTyping(false)
			stopTyping()
		}
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}

		textareaRef.current?.focus()
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}

	return (
		<form className={"relative flex h-max items-center gap-3"} onSubmit={handleSubmit}>
			<TextAreaBase
				aria-label="Message"
				ref={textareaRef}
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Type a message..."
				name="message"
				className={"h-32 w-full resize-none"}
			/>

			<ButtonUtility icon={Recording02} size="xs" color="tertiary" className="absolute top-2 right-2" />

			<div className="absolute right-3.5 bottom-2 flex items-center gap-2">
				<div className="flex items-center gap-0.5">
					<ButtonUtility icon={Attachment01} size="xs" color="tertiary" />
					<ButtonUtility icon={FaceSmile} size="xs" color="tertiary" />
				</div>

				<Button size="sm" color="link-color" type="submit">
					Send
				</Button>
			</div>
		</form>
	)
}
