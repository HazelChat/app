import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, Link, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { TabList, TabPanel, Tabs } from "~/components/application/tabs/tabs"
import { Avatar } from "~/components/base/avatar/avatar"
import IconHashtag from "~/components/icons/icon-hashtag"
import IconLock from "~/components/icons/icon-lock"
import { channelCollection, channelMemberCollection, userCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useUserPresence } from "~/hooks/use-presence"
import { useAuth } from "~/lib/auth"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/_app/$orgSlug/chat/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { organizationId } = useOrganization()
	const { user: me } = useAuth()

	// Get all channels with members and users in a single query
	const { data: channelsData, isLoading: channelsLoading } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.innerJoin({ user: userCollection }, ({ member, user }) => eq(user.id, member.userId))
				.where((q) => eq(q.channel.organizationId, organizationId))
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[organizationId],
	)

	const { publicChannels, privateChannels, dmChannels } = useMemo(() => {
		if (!channelsData || !me?.id) {
			return { publicChannels: [], privateChannels: [], dmChannels: [] }
		}

		// Group all data by channel
		const channelMap = new Map<string, { channel: any; members: any[]; myMember?: any }>()

		for (const row of channelsData) {
			if (!channelMap.has(row.channel.id)) {
				channelMap.set(row.channel.id, { channel: row.channel, members: [] })
			}
			const data = channelMap.get(row.channel.id)!
			data.members.push({ ...row.member, user: row.user })
			if (row.member.userId === me.id) {
				data.myMember = row.member
			}
		}

		// Filter to only channels where user is a member and not hidden, then split by type
		const public_: any[] = []
		const private_: any[] = []
		const dms: any[] = []

		for (const { channel, members, myMember } of channelMap.values()) {
			if (!myMember || myMember.isHidden) continue

			const baseData = {
				_id: channel.id,
				name: channel.name,
				type: channel.type,
				isMuted: myMember.isMuted,
				currentUser: { notificationCount: myMember.notificationCount || 0 },
			}

			if (channel.type === "public") {
				public_.push({ ...baseData, isFavorite: myMember.isFavorite })
			} else if (channel.type === "private") {
				private_.push({ ...baseData, isFavorite: myMember.isFavorite })
			} else if (channel.type === "direct" || channel.type === "single") {
				dms.push({ ...baseData, members })
			}
		}

		return { publicChannels: public_, privateChannels: private_, dmChannels: dms }
	}, [channelsData, me?.id])

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
	const { orgSlug } = useParams({ from: "/_app/$orgSlug" })
	return (
		<Link
			to="/$orgSlug/chat/$id"
			params={{ orgSlug, id: channel._id }}
			className="inset-ring inset-ring-transparent flex items-center justify-between gap-4 rounded-lg px-2.5 py-2 hover:inset-ring-secondary hover:bg-quaternary/40"
		>
			<div className="flex items-center gap-3">
				<div className="inset-ring inset-ring-secondary flex size-10 items-center justify-center rounded-md bg-primary">
					{isPrivate ? (
						<IconLock className="size-5 text-secondary" />
					) : (
						<IconHashtag className="size-5 text-secondary" />
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

function DmCard({ channel, currentUserId }: { channel: any; currentUserId?: string }) {
	const { orgSlug } = useParams({ from: "/_app/$orgSlug" })
	const otherMembers = channel.members.filter((member: any) => member.userId !== currentUserId)

	if (channel.type === "single" && otherMembers.length === 1) {
		const member = otherMembers[0]
		const { isOnline, status } = useUserPresence(member.user._id)

		return (
			<Link
				to="/$orgSlug/chat/$id"
				params={{ orgSlug, id: channel._id }}
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
						<p className="text-secondary text-sm">
							{isOnline
								? "Active now"
								: status === "away"
									? "Away"
									: status === "busy"
										? "Busy"
										: status === "dnd"
											? "Do not disturb"
											: "Offline"}
						</p>
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
			to="/$orgSlug/chat/$id"
			params={{ orgSlug, id: channel._id }}
			className="inset-ring inset-ring-transparent flex items-center justify-between gap-4 rounded-lg px-2.5 py-2 hover:inset-ring-secondary hover:bg-quaternary/40"
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
