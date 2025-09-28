import type { OrganizationId } from "@hazel/db/schema"
import { and, eq, or, useLiveQuery } from "@tanstack/react-db"
import { Link, useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { ErrorBoundary } from "react-error-boundary"
import IconChat1 from "~/components/icons/IconChat1"
import { channelCollection, channelMemberCollection, organizationCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"
import { CreateDmButton } from "../application/modals/create-dm-modal"
import IconChatChatting1 from "../icons/IconChatChatting1"
import IconGridDashboard01DuoSolid from "../icons/IconGridDashboard01DuoSolid"
import IconNotificationBellOn1 from "../icons/IconNotificationBellOn1"
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

export const AppSidebar = ({ setOpenCmd }: { setOpenCmd: (open: boolean) => void }) => {
	const { isMobile } = useSidebar()
	const params = useParams({ from: "/_app/$orgId" })
	const organizationId = params?.orgId as OrganizationId

	return (
		<Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
			<Sidebar
				collapsible="none"
				className="w-[calc(var(--sidebar-width-icon)+1px)]! border-primary border-r"
			>
				<SidebarHeader>
					<ErrorBoundary fallback={<div>Error</div>}>
						<WorkspaceSwitcher />
					</ErrorBoundary>
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
								<SidebarMenuItem>
									<SidebarMenuButton onClick={() => setOpenCmd(true)}>
										<IconChat1 />
										Find conversation
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarGroup>
							<SidebarFavoriteGroup />
							<ChannelGroup organizationId={organizationId} />
							<DmChannelGroup organizationId={organizationId} />
						</SidebarGroupContent>
					)}
				</SidebarContent>
				<SidebarFooter>
					<NavUser />
				</SidebarFooter>
			</Sidebar>

			{/* Desktop */}
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
							<SidebarMenuItem>
								<SidebarMenuButton onClick={() => setOpenCmd(true)}>
									<IconChat1 />
									Find conversation
									<span className="ml-auto font-mono text-xs">⌘K</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarFavoriteGroup />
					<ChannelGroup organizationId={organizationId} />
					<DmChannelGroup organizationId={organizationId} />
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	)
}

const ChannelGroup = (props: { organizationId: OrganizationId }) => {
	const { user } = useAuth()

	const { data: userChannels } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, props.organizationId),
						or(eq(q.channel.type, "public"), eq(q.channel.type, "private")),
						eq(q.member.userId, user?.id || ""),
						eq(q.member.isHidden, false),
						eq(q.member.isFavorite, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[user?.id, props.organizationId],
	)

	const channelIds = useMemo(() => {
		if (!userChannels) return []
		return userChannels.map((row) => row.channel.id)
	}, [userChannels])

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Channels</SidebarGroupLabel>
			<SidebarGroupAction>
				<ChannelActionsDropdown />
			</SidebarGroupAction>
			<SidebarGroupContent>
				<SidebarMenu>
					{channelIds.map((channelId) => (
						<ChannelItem key={channelId} channelId={channelId} />
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

const DmChannelGroup = (props: { organizationId: OrganizationId }) => {
	const { user } = useAuth()

	const { data: userDmChannels } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, props.organizationId),
						or(eq(q.channel.type, "direct"), eq(q.channel.type, "single")),
						eq(q.member.userId, user?.id),
						eq(q.member.isHidden, false),
						eq(q.member.isFavorite, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[user?.id, props.organizationId],
	)

	const dmChannelIds = useMemo(() => {
		if (!userDmChannels) return []
		return userDmChannels.map((row) => row.channel.id)
	}, [userDmChannels])

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
			<SidebarGroupAction>
				<CreateDmButton />
			</SidebarGroupAction>
			<SidebarGroupContent>
				<SidebarMenu>
					{dmChannelIds.map((channelId) => (
						// TODO: Add presence
						<DmChannelLink key={channelId} channelId={channelId} userPresence={[]} />
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

const ActiveServer = () => {
	const { orgId } = useParams({
		from: "/_app/$orgId",
	})

	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ organization: organizationCollection })
				.where(({ organization }) => eq(organization.id, orgId as OrganizationId)),
		[orgId],
	)

	return <div className="font-semibold text-foreground text-lg">{data[0]?.name}</div>
}
