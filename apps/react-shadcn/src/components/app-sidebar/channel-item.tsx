import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { FunctionReturnType } from "convex/server"
import { useCallback } from "react"
import { Pressable } from "react-aria"
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

type ChannelsResponse = FunctionReturnType<typeof api.channels.getChannelsForOrganization>

export interface ChannelItemProps {
	channel: ChannelsResponse["organizationChannels"][0]
}

export const ChannelItem = ({ channel }: ChannelItemProps) => {
	const leaveChannelMutation = useConvexMutation(api.channels.leaveChannelForOrganization)
	const updateChannelPreferencesMutation = useConvexMutation(
		api.channels.updateChannelPreferencesForOrganization,
	)

	const handleLeaveChannel = useCallback(() => {
		leaveChannelMutation({
			channelId: channel._id as Id<"channels">,
		})
	}, [channel._id, leaveChannelMutation])

	const handleToggleMute = useCallback(() => {
		updateChannelPreferencesMutation({
			channelId: channel._id as Id<"channels">,
			isMuted: !channel.isMuted,
		})
	}, [channel._id, channel.isMuted, updateChannelPreferencesMutation])

	const handleToggleFavorite = useCallback(() => {
		updateChannelPreferencesMutation({
			channelId: channel._id as Id<"channels">,
			isFavorite: !channel.isFavorite,
		})
	}, [channel._id, channel.isFavorite, updateChannelPreferencesMutation])

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild>
				<Link to="/app/chat" search={{ channelId: channel._id }}>
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

				<Dropdown.Popover placement="left top">
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
							Leave Channel
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
	const { data: me } = useQuery(convexQuery(api.me.getCurrentUser, {}))
	const updateChannelPreferencesMutation = useConvexMutation(
		api.channels.updateChannelPreferencesForOrganization,
	)

	const filteredMembers = channel.members.filter((member) => member.userId !== me?._id)

	const handleToggleMute = useCallback(() => {
		updateChannelPreferencesMutation({
			channelId: channel._id as Id<"channels">,
			isMuted: !channel.isMuted,
		})
	}, [channel._id, channel.isMuted, updateChannelPreferencesMutation])

	const handleToggleFavorite = useCallback(() => {
		updateChannelPreferencesMutation({
			channelId: channel._id as Id<"channels">,
			isFavorite: !channel.isFavorite,
		})
	}, [channel._id, channel.isFavorite, updateChannelPreferencesMutation])

	const handleClose = useCallback(() => {
		updateChannelPreferencesMutation({
			channelId: channel._id as Id<"channels">,
			isHidden: true,
		})
	}, [channel._id, updateChannelPreferencesMutation])

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild>
				<Link to="/app/chat" search={{ channelId: channel._id }}>
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
								<p className={cn("truncate", channel.isMuted && "opacity-60")}>
									{`${filteredMembers[0].user.firstName} ${filteredMembers[0].user.lastName}`}
								</p>
							</div>
						) : (
							<div className="-space-x-4 flex items-center justify-center">
								{filteredMembers.map((member) => (
									<div key={member.user._id} className="inline-block">
										<Avatar
											className="size-7"
											src={member.user.avatarUrl}
											alt={member.user.firstName[0]}
										></Avatar>
									</div>
								))}
								<p className={cn("truncate", channel.isMuted && "opacity-60")}>
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
				<Dropdown.Popover>
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
