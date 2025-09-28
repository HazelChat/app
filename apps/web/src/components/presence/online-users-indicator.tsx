import { useAuth } from "~/providers/auth-provider"

/**
 * Simple component to display the number of online users in the current organization
 */
export function OnlineUsersIndicator() {
	const { user } = useAuth()

	const onlineCount = 12

	if (!user?.id) {
		return null
	}

	return (
		<div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
			<div className="h-2 w-2 rounded-full bg-green-500" />
			<span>{onlineCount} online</span>
		</div>
	)
}
