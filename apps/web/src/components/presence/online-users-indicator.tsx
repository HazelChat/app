import { convexQuery } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useOnlineUsersCount } from "~/hooks/usePresenceData"

/**
 * Simple component to display the number of online users in the current organization
 */
export function OnlineUsersIndicator() {
	// Get current organization and user
	const organizationQuery = useQuery(convexQuery(api.me.getOrganization, {}))
	const userQuery = useQuery(convexQuery(api.me.getCurrentUser, {}))

	const organizationId = organizationQuery.data?.directive === "success" ? organizationQuery.data.data._id : undefined
	const userId = userQuery.data?._id

	// Get online users count
	const onlineCount = useOnlineUsersCount(organizationId, userId)

	if (!organizationId || !userId) {
		return null
	}

	return (
		<div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
			<div className="h-2 w-2 rounded-full bg-green-500" />
			<span>{onlineCount} online</span>
		</div>
	)
}