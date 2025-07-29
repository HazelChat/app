import { convexQuery } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useChat } from "~/hooks/use-chat"

export function TypingIndicator() {
	const { typingUsers } = useChat()
	const { data: currentUser } = useQuery(convexQuery(api.me.getCurrentUser, {}))

	// Filter out current user from typing users
	const otherTypingUsers = typingUsers.filter((user) => user.userId !== currentUser?._id)

	if (otherTypingUsers.length === 0) {
		return null
	}

	const typingText = () => {
		if (otherTypingUsers.length === 1) {
			return `${otherTypingUsers[0].user.firstName} is typing...`
		} else if (otherTypingUsers.length === 2) {
			return `${otherTypingUsers[0].user.firstName} and ${otherTypingUsers[1].user.firstName} are typing...`
		} else {
			return `${otherTypingUsers[0].user.firstName} and ${otherTypingUsers.length - 1} others are typing...`
		}
	}

	return (
		<div className="px-4 py-2">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
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
