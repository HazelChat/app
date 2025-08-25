import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { CreateDmButton } from "../application/modals/create-dm-modal"
import IconChatChatting1 from "../icons/IconChatChatting1"
import IconGridDashboard01DuoSolid from "../icons/IconGridDashboard01DuoSolid"
import IconNotificationBellOn1 from "../icons/IconNotificationBellOn1"
import { usePresence } from "../presence/presence-provider"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "../ui/sidebar"
import { ChannelActionsDropdown } from "./channel-actions-dropdown"
import { ChannelItem, DmChannelLink } from "./channel-item"
import { NavUser } from "./nav-user"
import { SidebarFavoriteGroup } from "./sidebar-favorite-group"
import { WorkspaceSwitcher } from "./workspace-switcher"

export const AppSidebar = () => {
	const { isMobile } = useSidebar()
	const params = useParams({ from: "/_app/$orgId" })
	const organizationId = params?.orgId as Id<"organizations">

	const channelsQuery = useQuery(
		convexQuery(
			api.channels.getChannelsForOrganization,
			organizationId
				? {
						organizationId,
						favoriteFilter: {
							favorite: false,
						},
					}
				: "skip",
		),
	)

	const dmChannels = useMemo(() => channelsQuery.data?.dmChannels || [], [channelsQuery.data])

	const { presenceList } = usePresence()
	return (
		<Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
			<Sidebar
				collapsible="none"
				className="w-[calc(var(--sidebar-width-icon)+1px)]! border-primary border-r"
			>
				<SidebarHeader>
					<WorkspaceSwitcher />
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenuItem>
								<SidebarMenuButton className="px-2.5 md:px-2" asChild>
									<Link
										to={"/$orgId"}
										params={{ orgId: organizationId }}
										activeOptions={{
											exact: true,
										}}
									>
										<IconGridDashboard01DuoSolid />
										<span>Home</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="px-2.5 md:px-2" asChild>
									<Link
										to={"/$orgId/chat"}
										params={{ orgId: organizationId }}
										activeOptions={{
											exact: true,
										}}
									>
										<IconChatChatting1 />
										<span>Chat</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarGroupContent>
					</SidebarGroup>
					{isMobile && (
						<SidebarGroupContent className="sm:hidden">
							<SidebarGroup>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<IconNotificationBellOn1 />
										Notifications
										<SidebarMenuBadge className="rounded-full bg-destructive">
											1
										</SidebarMenuBadge>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarGroup>
							<SidebarFavoriteGroup />
							<SidebarGroup>
								<SidebarGroupLabel>Channels</SidebarGroupLabel>
								<SidebarGroupAction>
									<ChannelActionsDropdown />
								</SidebarGroupAction>
								<SidebarGroupContent>
									<SidebarMenu>
										{channelsQuery.data?.organizationChannels?.map((channel) => (
											<ChannelItem key={channel._id} channel={channel} />
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
							<SidebarGroup>
								<SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
								<SidebarGroupAction>
									<CreateDmButton />
								</SidebarGroupAction>
								<SidebarGroupContent>
									<SidebarMenu>
										{dmChannels.map((channel) => (
											<DmChannelLink
												key={channel._id}
												userPresence={presenceList}
												channel={channel}
											/>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						</SidebarGroupContent>
					)}
				</SidebarContent>
				<SidebarFooter>
					<NavUser />
				</SidebarFooter>
			</Sidebar>
			<Sidebar collapsible="none" className="hidden flex-1 border-primary md:flex">
				<SidebarHeader className="gap-3.5 p-4">
					<div className="flex w-full items-center justify-between">
						<ActiveServer />
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenuItem>
								<SidebarMenuButton>
									<IconNotificationBellOn1 />
									Notifications
									<SidebarMenuBadge className="rounded-full bg-destructive">
										1
									</SidebarMenuBadge>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarFavoriteGroup />
					<SidebarGroup>
						<SidebarGroupLabel>Channels</SidebarGroupLabel>
						<SidebarGroupAction>
							<ChannelActionsDropdown />
						</SidebarGroupAction>
						<SidebarGroupContent>
							<SidebarMenu>
								{channelsQuery.data?.organizationChannels?.map((channel) => (
									<ChannelItem key={channel._id} channel={channel} />
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
						<SidebarGroupAction>
							<CreateDmButton />
						</SidebarGroupAction>
						<SidebarGroupContent>
							<SidebarMenu>
								{dmChannels.map((channel) => (
									<DmChannelLink
										key={channel._id}
										userPresence={presenceList}
										channel={channel}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	)
}

const ActiveServer = () => {
	const { orgId } = useParams({
		from: "/_app/$orgId",
	})
	const { data } = useQuery(
		convexQuery(api.organizations.getOrganizationById, {
			organizationId: orgId as Id<"organizations">,
		}),
	)

	return <div className="font-semibold text-foreground text-lg">{data?.name}</div>
}
