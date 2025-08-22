import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import type { FunctionReturnType } from "convex/server"
import { useCallback } from "react"
import { Pressable } from "react-aria-components"
import { cn } from "~/lib/utils"
import { cx } from "~/utils/cx"
import { Avatar } from "../base/avatar/avatar"
import { Dropdown } from "../base/dropdown/dropdown"
import IconHashtagStroke from "../icons/IconHashtagStroke"
import IconMultipleCrossCancelStroke from "../icons/IconMultipleCrossCancelStroke"
import IconPhone2 from "../icons/IconPhone2"
import IconStar1 from "../icons/IconStar1"
import IconThreeDotsMenuHorizontalStroke from "../icons/IconThreeDotsMenuHorizontalStroke"
import IconVolumeMute1 from "../icons/IconVolumeMute1"
import IconVolumeOne1 from "../icons/IconVolumeOne1"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import IconPencilEdit from "~/components/icons/IconPencilEdit";
import IconTruckTrash from "~/components/icons/IconTruckTrash";
import IconDeleteBackwardLeft from "~/components/icons/IconDeleteBackwardLeft";
import IconDeleteDustbin011 from "~/components/icons/IconDeleteDustbin011";

type ChannelsResponse = FunctionReturnType<typeof api.channels.getChannelsForOrganization>

export interface ChannelItemProps {
	channel: ChannelsResponse["organizationChannels"][0]
}

export const ChannelItem = ({ channel }: ChannelItemProps) => {
	const queryClient = useQueryClient()
	const params = useParams({ from: "/_app/$orgId" })
	const organizationId = params?.orgId as Id<"organizations">

	const leaveChannelMutation = useConvexMutation(api.channels.leaveChannelForOrganization)
	const updateChannelPreferencesMutation = useConvexMutation(
		api.channels.updateChannelPreferencesForOrganization,
	)

	const handleLeaveChannel = useCallback(() => {
		if (organizationId) {
			leaveChannelMutation({
				organizationId,
				channelId: channel._id as Id<"channels">,
			})
		}
	}, [channel._id, organizationId, leaveChannelMutation])

	const handleToggleMute = useCallback(() => {
		if (organizationId) {
			updateChannelPreferencesMutation({
				organizationId,
				channelId: channel._id as Id<"channels">,
				isMuted: !channel.isMuted,
			})
		}
	}, [channel._id, channel.isMuted, organizationId, updateChannelPreferencesMutation])

	const handleToggleFavorite = useCallback(() => {
		if (organizationId) {
			updateChannelPreferencesMutation({
				organizationId,
				channelId: channel._id as Id<"channels">,
				isFavorite: !channel.isFavorite,
			})
		}
	}, [channel._id, channel.isFavorite, organizationId, updateChannelPreferencesMutation])

	const handleMouseEnter = useCallback(() => {
		// Prefetch channel data on hover
		if (organizationId) {
			queryClient.prefetchQuery(
				convexQuery(api.channels.getChannel, {
					channelId: channel._id as Id<"channels">,
					organizationId,
				}),
			)
		}
	}, [channel._id, organizationId, queryClient])

	return (
		<SidebarMenuItem onMouseEnter={handleMouseEnter}>
			<SidebarMenuButton asChild>
				<Link to="/$orgId/chat/$id" params={{ orgId: organizationId || "", id: channel._id }}>
					<IconHashtagStroke className="size-5" />
					<p className={cn("text-ellipsis text-nowrap", channel.isMuted && "opacity-60")}>
						{channel.name}
					</p>
					{channel.currentUser.notificationCount > 0 && (
						<div className="-translate-y-1/2 absolute top-1/2 right-1 flex h-2.5 items-center justify-center rounded-lg border bg-muted p-2 text-xs transition-all duration-200 group-focus-within/menu-item:right-6 group-hover/menu-action:right-6 group-hover/menu-item:right-6 group-data-[state=open]/menu-action:right-6 [&:has(+[data-sidebar=menu-action][data-state=open])]:right-6">
							{channel.currentUser.notificationCount}
						</div>
					)}
				</Link>
			</SidebarMenuButton>
			<Dropdown.Root>
				<Pressable>
					<SidebarMenuAction
						showOnHover
						className="rounded-sm text-foreground data-[state=open]:bg-muted"
					>
						<IconThreeDotsMenuHorizontalStroke className="text-foreground" />
						<span className="sr-only">More</span>
					</SidebarMenuAction>
				</Pressable>

				<Dropdown.Popover placement="right top" className="w-42">
					<Dropdown.Menu>
						<Dropdown.Item
							onAction={handleToggleMute}
							icon={channel.isMuted ? IconVolumeOne1 : IconVolumeMute1}
						>
							{channel.isMuted ? "Unmute" : "Mute"}
						</Dropdown.Item>
						<Dropdown.Item
							onAction={handleToggleFavorite}
							icon={(props) =>
								channel.isFavorite ? (
									<IconStar1 className={cx("text-amber-500", props.className)} />
								) : (
									<IconStar1 className={props.className}></IconStar1>
								)
							}
						>
							{channel.isFavorite ? "Unfavorite" : "Favorite"}
						</Dropdown.Item>
            <Dropdown.Separator/>
            <Dropdown.Item icon={(props) => <IconPencilEdit className={cx("text-amber-500", props.className)}/>}>
              Rename
            </Dropdown.Item>
            <Dropdown.Item icon={(props) => <IconDeleteDustbin011 className={cx("text-amber-500", props.className)}/>}>
              Delete
            </Dropdown.Item>
            <Dropdown.Separator/>
						<Dropdown.Item
							className="text-destructive"
							icon={(props) => (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className={props.className}
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" x2="9" y1="12" y2="12" />
								</svg>
							)}
							onAction={handleLeaveChannel}
						>
							Leave
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>
		</SidebarMenuItem>
	)
}

interface DmChannelLinkProps {
	channel: ChannelsResponse["dmChannels"][0]
	userPresence: {
		userId: string
		online: boolean
		lastDisconnected: number
	}[]
}

export const DmChannelLink = ({ channel, userPresence }: DmChannelLinkProps) => {
	const params = useParams({ from: "/_app/$orgId" })
	const organizationId = params?.orgId as Id<"organizations">

	const { data: me } = useQuery(
		convexQuery(api.me.getCurrentUser, organizationId ? { organizationId } : "skip"),
	)
	const queryClient = useQueryClient()
	const updateChannelPreferencesMutation = useConvexMutation(
		api.channels.updateChannelPreferencesForOrganization,
	)

	const filteredMembers = channel.members.filter((member) => member.userId !== me?._id)

	const handleToggleMute = useCallback(() => {
		if (organizationId) {
			updateChannelPreferencesMutation({
				organizationId,
				channelId: channel._id as Id<"channels">,
				isMuted: !channel.isMuted,
			})
		}
	}, [channel._id, channel.isMuted, organizationId, updateChannelPreferencesMutation])

	const handleToggleFavorite = useCallback(() => {
		if (organizationId) {
			updateChannelPreferencesMutation({
				organizationId,
				channelId: channel._id as Id<"channels">,
				isFavorite: !channel.isFavorite,
			})
		}
	}, [channel._id, channel.isFavorite, organizationId, updateChannelPreferencesMutation])

	const handleClose = useCallback(() => {
		if (organizationId) {
			updateChannelPreferencesMutation({
				organizationId,
				channelId: channel._id as Id<"channels">,
				isHidden: true,
			})
		}
	}, [channel._id, organizationId, updateChannelPreferencesMutation])

	const handleMouseEnter = useCallback(() => {
		// Prefetch channel data on hover
		if (organizationId) {
			queryClient.prefetchQuery(
				convexQuery(api.channels.getChannel, {
					channelId: channel._id as Id<"channels">,
					organizationId,
				}),
			)
		}
	}, [channel._id, organizationId, queryClient])

	return (
		<SidebarMenuItem onMouseEnter={handleMouseEnter}>
			<SidebarMenuButton asChild>
				<Link to="/$orgId/chat/$id" params={{ orgId: organizationId || "", id: channel._id }}>
					<div className="-space-x-4 flex items-center justify-center">
						{channel.type === "single" && filteredMembers.length === 1 ? (
							<div className="flex items-center justify-center gap-3">
								<Avatar
									size="xs"
									src={filteredMembers[0].user.avatarUrl}
									alt={`${filteredMembers[0].user.firstName} ${filteredMembers[0].user.lastName}`}
									status={
										userPresence.find((p) => p.userId === filteredMembers[0].user._id)
											?.online
											? "online"
											: "offline"
									}
								/>

								<p className={cn("max-w-20 truncate", channel.isMuted && "opacity-60")}>
									{`${filteredMembers[0].user.firstName} ${filteredMembers[0].user.lastName}`}
								</p>
							</div>
						) : (
							<div className="flex items-center gap-1">
								<div className="-space-x-2 flex">
									{filteredMembers.slice(0, 2).map((member) => (
										<Avatar
											key={member.user._id}
											size="xs"
											src={member.user.avatarUrl}
											alt={member.user.firstName[0]}
											className="ring-[1.5px] ring-sidebar"
										/>
									))}

									{filteredMembers.length > 2 && (
										<Avatar
											size="xs"
											className="ring-[1.5px] ring-sidebar"
											placeholder={
												<span className="flex items-center justify-center font-semibold text-quaternary text-sm">
													+{filteredMembers.length - 2}
												</span>
											}
										/>
									)}
								</div>
								<p className={cn("max-w-20 truncate", channel.isMuted && "opacity-60")}>
									{filteredMembers
										.map((member) => `${member.user.firstName} ${member.user.lastName}`)
										.join(", ")}
								</p>
							</div>
						)}
					</div>
					{channel.currentUser.notificationCount > 0 && (
						<div className="-translate-y-1/2 absolute top-1/2 right-1 flex h-2.5 items-center justify-center rounded-lg border bg-muted p-2 text-xs transition-all duration-200 group-focus-within/menu-item:right-6 group-hover/menu-action:right-6 group-hover/menu-item:right-6 group-data-[state=open]/menu-action:right-6 [&:has(+[data-sidebar=menu-action][data-state=open])]:right-6">
							{channel.currentUser.notificationCount}
						</div>
					)}
				</Link>
			</SidebarMenuButton>

			<Dropdown.Root>
				<Pressable>
					<SidebarMenuAction
						showOnHover
						className="rounded-sm text-foreground data-[state=open]:bg-muted"
					>
						<IconThreeDotsMenuHorizontalStroke className="text-foreground" />
						<span className="sr-only">More</span>
					</SidebarMenuAction>
				</Pressable>
				<Dropdown.Popover placement="right top" className="w-42">
					<Dropdown.Menu>
						<Dropdown.Section>
							<Dropdown.Item
								onAction={() => {
									console.log("TODO: Implement call")
								}}
								icon={IconPhone2}
							>
								Call
							</Dropdown.Item>
							<Dropdown.Separator />
							<Dropdown.Item
								onAction={handleToggleMute}
								icon={channel.isMuted ? IconVolumeOne1 : IconVolumeMute1}
							>
								{channel.isMuted ? "Unmute" : "Mute"}
							</Dropdown.Item>
							<Dropdown.Item
								onAction={handleToggleFavorite}
								icon={({ className }) =>
									channel.isFavorite ? (
										<IconStar1 className={cx(className, "text-amber-500")} />
									) : (
										<IconStar1 className={className} />
									)
								}
							>
								{channel.isFavorite ? "Unfavorite" : "Favorite"}
							</Dropdown.Item>
							<Dropdown.Item
								className="text-destructive"
								onAction={handleClose}
								icon={IconMultipleCrossCancelStroke}
							>
								Close
							</Dropdown.Item>
						</Dropdown.Section>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>
		</SidebarMenuItem>
	)
}
