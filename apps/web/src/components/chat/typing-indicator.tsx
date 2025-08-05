import { useChat } from "~/hooks/use-chat"

export function TypingIndicator() {
	const { typingUsers } = useChat()

	console.log("[DEBUG] Typing users:", typingUsers.map((u) => u.user.firstName).join(", "))

	if (typingUsers.length === 0) {
		return null
	}

	const typingText = () => {
		if (typingUsers.length === 1) {
			return `${typingUsers[0].user.firstName} is typing...`
		} else if (typingUsers.length === 2) {
			return `${typingUsers[0].user.firstName} and ${typingUsers[1].user.firstName} are typing...`
		} else {
			return `${typingUsers[0].user.firstName} and ${typingUsers.length - 1} others are typing...`
		}
	}

	return (
		<div className="px-4 py-2 bg-red-700">
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<div className="flex gap-1">
					<span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
					<span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
					<span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
				</div>
				<span>{typingText()}</span>
			</div>
		</div>
	)
}
