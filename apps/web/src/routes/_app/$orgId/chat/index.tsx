import type { OrganizationId } from "@hazel/db/schema"
import { and, eq, or, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { TabList, TabPanel, Tabs } from "~/components/application/tabs/tabs"
import { Avatar } from "~/components/base/avatar/avatar"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import IconLockCloseStroke from "~/components/icons/IconLockCloseStroke"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/_app/$orgId/chat/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const organizationId = orgId as OrganizationId
	const { user: me } = useAuth()
	// const { presenceList } = usePresence()

	const presenceList: any[] = [] // TODO: Add presence list

	// Get all channels for this organization that the user is a member of
	const { data: userChannels, isLoading: channelsLoading } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, organizationId),
						eq(q.member.userId, me?.id || ""),
						eq(q.member.isHidden, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[me?.id, organizationId],
	)

	const publicChannels = useMemo(
		() =>
			userChannels
				?.filter((row) => row.channel.type === "public")
				.map((row) => ({
					_id: row.channel.id,
					name: row.channel.name,
					type: row.channel.type,
					isMuted: row.member.isMuted,
					isFavorite: row.member.isFavorite,
					currentUser: { notificationCount: row.member.notificationCount || 0 },
					members: [], // TODO: Add member count
				})) || [],
		[userChannels],
	)

	const privateChannels = useMemo(
		() =>
			userChannels
				?.filter((row) => row.channel.type === "private")
				.map((row) => ({
					_id: row.channel.id,
					name: row.channel.name,
					type: row.channel.type,
					isMuted: row.member.isMuted,
					isFavorite: row.member.isFavorite,
					currentUser: { notificationCount: row.member.notificationCount || 0 },
					members: [], // TODO: Add member count
				})) || [],
		[userChannels],
	)

	const dmChannels = useMemo(
		() =>
			userChannels
				?.filter((row) => row.channel.type === "direct" || row.channel.type === "single")
				.map((row) => ({
					_id: row.channel.id,
					name: row.channel.name,
					type: row.channel.type,
					isMuted: row.member.isMuted,
					currentUser: { notificationCount: row.member.notificationCount || 0 },
					members: [], // TODO: Add DM participants
				})) || [],
		[userChannels],
	)

	if (channelsLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-6 p-6 lg:p-12">
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="space-y-0.5">
						<SectionHeader.Heading>All channels</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Discover communities and join the discussions that matter to you.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>
			<Tabs>
				<TabList
					className="mb-2 w-auto rounded-lg border border-primary p-1"
					items={[
						{ label: "Public", id: "public" },
						{ label: "Private", id: "private" },
						{ label: "Direct message", id: "dms" },
					]}
				/>

				<TabPanel id="public">
					{publicChannels.length > 0 && (
						<div className="w-full rounded-lg border border-primary p-2">
							<h2 className="sr-only">Public Channels</h2>
							<div className="space-y-2">
								{publicChannels.map((channel) => (
									<ChannelCard key={channel._id} channel={channel} />
								))}
							</div>
						</div>
					)}
				</TabPanel>
				<TabPanel id="private">
					{privateChannels.length > 0 && (
						<div className="w-full rounded-lg border border-primary p-2">
							<h2 className="sr-only">Private Channels</h2>
							<div className="space-y-2">
								{privateChannels.map((channel) => (
									<ChannelCard key={channel._id} channel={channel} isPrivate />
								))}
							</div>
						</div>
					)}
				</TabPanel>
				<TabPanel id="dms">
					{dmChannels.length > 0 && (
						<div className="w-full rounded-lg border border-primary p-2">
							<div className="space-y-2">
								{dmChannels.length > 0 && (
									<div className="w-full">
										<h2 className="sr-only">Direct Messages</h2>
										<div className="space-y-2">
											{dmChannels.map((channel) => (
												<DmCard
													key={channel._id}
													channel={channel}
													currentUserId={me?.id}
													presenceList={presenceList}
												/>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</TabPanel>
			</Tabs>

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
			className="inset-ring inset-ring-transparent flex items-center justify-between gap-4 rounded-lg px-2.5 py-2 hover:inset-ring-secondary hover:bg-quaternary/40"
		>
			<div className="flex items-center gap-3">
				<div className="inset-ring inset-ring-secondary flex size-10 items-center justify-center rounded-md bg-primary">
					{isPrivate ? (
						<IconLockCloseStroke className="size-5 text-secondary" />
					) : (
						<IconHashtagStroke className="size-5 text-secondary" />
					)}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h3 className={cn("font-semibold text-sm/5", channel.isMuted && "opacity-60")}>
							{channel.name}
						</h3>
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
				className="inset-ring inset-ring-transparent flex items-center justify-between gap-4 rounded-lg px-2.5 py-2 hover:inset-ring-secondary hover:bg-quaternary/40"
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
			className="inset-ring inset-ring inset-ring-transparent inset-ring-transparent flex items-center justify-between gap-4 rounded-lg px-2.5 py-2 hover:inset-ring-secondary hover:bg-quaternary/40"
		>
			<div className="flex items-center gap-2.5">
				<div className="-space-x-4 flex">
					{otherMembers.slice(0, 3).map((member: any) => (
						<Avatar
							key={member.user._id}
							className="size-9 border-1 border-primary"
							src={member.user.avatarUrl}
							alt={member.user.firstName[0]}
						/>
					))}
				</div>
				<div>
					<h3 className={cn("font-semibold text-sm/6", channel.isMuted && "opacity-60")}>
						{otherMembers
							.slice(0, 3)
							.map((member: any) => `${member.user.firstName} ${member.user.lastName}`)
							.join(", ")}{" "}
						{otherMembers.length > 3 && (
							<span className="text-tertiary">+{otherMembers.length - 3} more</span>
						)}
					</h3>
					<p className="text-sm text-tertiary">{otherMembers.length} participants</p>
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
