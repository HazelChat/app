import type { ChannelId } from "@hazel/db/schema"
import { and, eq, useLiveQuery } from "@tanstack/react-db"
import { useMemo } from "react"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "../ui/sidebar"
import { ChannelItem, DmChannelLink } from "./channel-item"

export const SidebarFavoriteGroup = () => {
	const { organizationId } = useOrganization()
	const { user } = useAuth()

	const { data: favoriteChannels } = useLiveQuery(
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

	const channelIds = useMemo(() => {
		if (!favoriteChannels) return []
		return favoriteChannels.map((row) => row.channel.id)
	}, [favoriteChannels])

	const { publicPrivateChannelIds, dmChannelIds } = useMemo(() => {
		if (!favoriteChannels) return { publicPrivateChannelIds: [], dmChannelIds: [] }

		const publicPrivate: ChannelId[] = []
		const dm: ChannelId[] = []

		favoriteChannels.forEach((row) => {
			if (row.channel.type === "public" || row.channel.type === "private") {
				publicPrivate.push(row.channel.id)
			} else if (row.channel.type === "direct" || row.channel.type === "single") {
				dm.push(row.channel.id)
			}
		})

		return { publicPrivateChannelIds: publicPrivate, dmChannelIds: dm }
	}, [favoriteChannels])

	if (channelIds.length === 0) {
		return null
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Favorites</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{publicPrivateChannelIds.map((channelId) => (
						<ChannelItem key={channelId} channelId={channelId} />
					))}
					{dmChannelIds.map((channelId) => (
						<DmChannelLink key={channelId} channelId={channelId} />
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
