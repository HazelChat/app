import { and, eq, useLiveQuery } from "@tanstack/react-db"
import { useEffect, useRef } from "react"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useNotificationSound } from "~/hooks/use-notification-sound"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"

export function NotificationManager() {
	const { organizationId } = useOrganization()
	const { user } = useAuth()
	const { playSound } = useNotificationSound()

	const prevNotificationCounts = useRef<Map<string, number>>(new Map())
	const isFirstRender = useRef(true)

	const { data: userChannels } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, organizationId),
						eq(q.member.userId, user?.id),
						eq(q.member.isHidden, false),
						eq(q.member.isFavorite, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[organizationId, user?.id],
	)

	useEffect(() => {
		if (!userChannels) return

		for (const row of userChannels) {
			const channelId = row.channel.id
			const currentCount = row.member.notificationCount || 0
			const prevCount = prevNotificationCounts.current.get(channelId) || 0

			if (!isFirstRender.current && currentCount > prevCount && !row.member.isMuted) {
				playSound()
			}

			prevNotificationCounts.current.set(channelId, currentCount)
		}

		if (isFirstRender.current) {
			isFirstRender.current = false
		}
	}, [userChannels, playSound])

	return null
}
