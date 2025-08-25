import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { Avatar } from "~/components/base/avatar/avatar"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import IconLockCloseStroke from "~/components/icons/IconLockCloseStroke"
import { usePresence } from "~/components/presence/presence-provider"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/_app/$orgId/chat/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const organizationId = orgId as Id<"organizations">
	const channelsQuery = useQuery(convexQuery(api.channels.getChannelsForOrganization, { organizationId }))
	const { data: me } = useQuery(convexQuery(api.me.getCurrentUser, { organizationId }))
	const { presenceList } = usePresence()

	const publicChannels = useMemo(
		() => channelsQuery.data?.organizationChannels?.filter((ch) => ch.type === "public") || [],
		[channelsQuery.data],
	)

	const privateChannels = useMemo(
		() => channelsQuery.data?.organizationChannels?.filter((ch) => ch.type === "private") || [],
		[channelsQuery.data],
	)

	const dmChannels = useMemo(() => channelsQuery.data?.dmChannels || [], [channelsQuery.data])

	if (channelsQuery.isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
			</div>
		)
	}

	return (
			<div className="flex flex-col p-4 sm:py-12 gap-6">
				<div className="w-full">
					<h1 className="mb-2 font-semibold text-2xl">All Channels</h1>
					<p className="text-secondary">Browse and join conversations</p>
				</div>

				{publicChannels.length > 0 && (
					<div className="w-full">
						<h2 className="mb-4 font-semibold text-lg">Public Channels</h2>
						<div className="space-y-2">
							{publicChannels.map((channel) => (
								<ChannelCard key={channel._id} channel={channel} />
							))}
						</div>
					</div>
				)}

				{privateChannels.length > 0 && (
					<div className="w-full">
						<h2 className="mb-4 font-semibold text-lg">Private Channels</h2>
						<div className="space-y-2">
							{privateChannels.map((channel) => (
								<ChannelCard key={channel._id} channel={channel} isPrivate />
							))}
						</div>
					</div>
				)}

				{dmChannels.length > 0 && (
					<div className="w-full">
						<h2 className="mb-4 font-semibold text-lg">Direct Messages</h2>
						<div className="space-y-2">
							{dmChannels.map((channel) => (
								<DmCard
									key={channel._id}
									channel={channel}
									currentUserId={me?._id}
									presenceList={presenceList}
								/>
							))}
						</div>
					</div>
				)}

				{!publicChannels.length && !privateChannels.length && !dmChannels.length && (
					<div className="flex h-64 items-center justify-center">
						<p className="text-secondary">No channels available</p>
					</div>
				)}
			</div>
	)
}

function ChannelCard({ channel, isPrivate = false }: { channel: any; isPrivate?: boolean }) {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	return (
		<Link
			to="/$orgId/chat/$id"
			params={{ orgId, id: channel._id }}
			className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-quaternary/40"
		>
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center">
					{isPrivate ? (
						<IconLockCloseStroke className="size-5 text-secondary" />
					) : (
						<IconHashtagStroke className="size-5 text-secondary" />
					)}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h3 className={cn("font-medium", channel.isMuted && "opacity-60")}>{channel.name}</h3>
						{channel.isFavorite && <span className="text-amber-500">★</span>}
					</div>
					{channel.description && (
						<p className="line-clamp-1 text-secondary text-sm">{channel.description}</p>
					)}
					<div className="mt-1 flex items-center gap-4 text-secondary text-xs">
						<span>{channel.members?.length || 0} members</span>
						{channel.isMuted && <span>Muted</span>}
					</div>
				</div>
			</div>
			{channel.currentUser?.notificationCount > 0 && (
				<div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-fg-error-primary px-1.5 font-medium text-error-primary text-xs">
					{channel.currentUser.notificationCount}
				</div>
			)}
		</Link>
	)
}

function DmCard({
	channel,
	currentUserId,
	presenceList,
}: {
	channel: any
	currentUserId?: string
	presenceList: any[]
}) {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const otherMembers = channel.members.filter((member: any) => member.userId !== currentUserId)

	if (channel.type === "single" && otherMembers.length === 1) {
		const member = otherMembers[0]
		const isOnline = presenceList.find((p) => p.userId === member.user._id)?.online

		return (
			<Link
				to="/$orgId/chat/$id"
				params={{ orgId, id: channel._id }}
				className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-quaternary/40"
			>
				<div className="flex items-center gap-3">
					<Avatar
						size="md"
						src={member.user.avatarUrl}
						alt={`${member.user.firstName} ${member.user.lastName}`}
						status={isOnline ? "online" : "offline"}
					/>
					<div>
						<h3 className={cn("font-medium", channel.isMuted && "opacity-60")}>
							{member.user.firstName} {member.user.lastName}
						</h3>
						<p className="text-secondary text-sm">{isOnline ? "Active now" : "Offline"}</p>
					</div>
				</div>
				{channel.currentUser?.notificationCount > 0 && (
					<div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 font-medium text-destructive-foreground text-xs">
						{channel.currentUser.notificationCount}
					</div>
				)}
			</Link>
		)
	}

	return (
		<Link
			to="/$orgId/chat/$id"
			params={{ orgId, id: channel._id }}
			className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/40"
		>
			<div className="flex items-center gap-3">
				<div className="-space-x-2 flex">
					{otherMembers.slice(0, 3).map((member: any) => (
						<Avatar
							key={member.user._id}
							className="size-10 border-2 border-background"
							src={member.user.avatarUrl}
							alt={member.user.firstName[0]}
						/>
					))}
				</div>
				<div>
					<h3 className={cn("font-medium", channel.isMuted && "opacity-60")}>
						{otherMembers
							.map((member: any) => `${member.user.firstName} ${member.user.lastName}`)
							.join(", ")}
					</h3>
					<p className="text-secondary text-sm">{otherMembers.length} participants</p>
				</div>
			</div>
			{channel.currentUser?.notificationCount > 0 && (
				<div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 font-medium text-destructive-foreground text-xs">
					{channel.currentUser.notificationCount}
				</div>
			)}
		</Link>
	)
}
