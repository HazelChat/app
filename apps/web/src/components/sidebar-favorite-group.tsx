import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { ChannelItem, DmChannelLink } from "./app-sidebar/channel-item"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "./ui/sidebar"

export const SidebarFavoriteGroup = () => {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const organizationId = orgId as Id<"organizations">

	const favoritedChannelsQuery = useQuery(
		convexQuery(api.channels.getChannelsForOrganization, {
			organizationId,
			favoriteFilter: {
				favorite: true,
			},
		}),
	)

	// TODO: Add presence state when available
	const userPresenceState = { presenceList: [] }

	const channels = useMemo(
		() => [
			...(favoritedChannelsQuery.data?.dmChannels || []),
			...(favoritedChannelsQuery.data?.organizationChannels || []),
		],
		[favoritedChannelsQuery.data],
	)

	if (channels.length === 0) {
		return null
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Favorites</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{channels.map((channel) => {
						if (channel.type === "private" || channel.type === "public") {
							return <ChannelItem key={channel._id} channelId={channel._id} />
						}
						return (
							<DmChannelLink
								key={channel._id}
								userPresence={userPresenceState.presenceList}
								channelId={channel._id}
							/>
						)
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
