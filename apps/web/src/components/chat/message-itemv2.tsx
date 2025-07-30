import type { api } from "@hazel/backend/api"
import type { FunctionReturnType } from "convex/server"
import { TextEditor } from "./read-only-message"

type Message = FunctionReturnType<typeof api.messages.getMessages>["page"][0]

interface MessageItemProps {
	message: Message
}

export function MessageItem2({ message }: MessageItemProps) {
	return (
		<TextEditor.Root content={message.jsonContent}>
			<TextEditor.Content readOnly></TextEditor.Content>
		</TextEditor.Root>
	)
}
