import type { OrganizationId } from "@hazel/db/schema"
import { and, eq, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"
import { ChannelItem, DmChannelLink } from "./app-sidebar/channel-item"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "./ui/sidebar"

export const SidebarFavoriteGroup = () => {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const organizationId = orgId as OrganizationId

	const { user } = useAuth()

	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, organizationId),
						eq(q.member.userId, user?.id || ""),
						eq(q.member.isFavorite, true),
						eq(q.member.isHidden, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[user?.id, organizationId],
	)

	// TODO: Add presence state when available
	const userPresenceState = { presenceList: [] }

	if (data.length === 0) {
		return null
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Favorites</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{data.map(({ channel }) => {
						if (channel.type === "private" || channel.type === "public") {
							return <ChannelItem key={channel.id} channelId={channel.id} />
						}
						return (
							<DmChannelLink
								key={channel.id}
								userPresence={userPresenceState.presenceList}
								channelId={channel.id}
							/>
						)
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
