import { Link } from "@tanstack/react-router"
import { Dialog } from "./ui/dialog"
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
} from "./ui/sidebar"

export const AppSidebar = () => {
	return (
		<Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
			<Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
				<SidebarHeader>{/* <WorkspaceSwitcher /> */}</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenuItem>
								<SidebarMenuButton
									className="px-2.5 md:px-2"
									// as={Link}
									// to="/app"
									// activeOptions={{
									// 	exact: true,
									// }}
								>
									{/* <IconGridDashboard01DuoSolid /> */}
									<span>Home</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton className="px-2.5 md:px-2">
									{/* <IconChatChatting1 /> */}
									{/* <IconChatChattingDuoSolid /> */}
									<span>Chat</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>{/* <NavUser /> */}</SidebarFooter>
			</Sidebar>
			<Sidebar collapsible="none" className="hidden flex-1 md:flex">
				<SidebarHeader className="gap-3.5 p-4">
					<div className="flex w-full items-center justify-between">{/* <ActiveServer /> */}</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenuItem>
								<SidebarMenuButton>
									{/* <IconNotificationBellOn1 />  */}
									Notifications
									<SidebarMenuBadge className="rounded-full bg-destructive">
										1
									</SidebarMenuBadge>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarGroupContent>
					</SidebarGroup>
					{/* <SidebarFavoriteGroup /> */}
					<SidebarGroup>
						<SidebarGroupLabel>Channels</SidebarGroupLabel>
						<SidebarGroupAction>
							{/* <Dialog
								open={createChannelModalOpen()}
								onOpenChange={(details) => setCreateChannelModalOpen(details.open)}
							>
								<Dialog.Trigger
									asChild={(props) => (
										<IconButton className="size-4.5" {...props}>
											<IconPlusStroke />
										</IconButton>
									)}
								/>
								<Dialog.Content>
									<Tabs defaultValue={"join"}>
										<Tabs.List>
											<Tabs.Trigger value="join">Join</Tabs.Trigger>
											<Tabs.Trigger value="create">Create New</Tabs.Trigger>
										</Tabs.List>
										<Tabs.Content value="join">
											<JoinPublicChannel
												onSuccess={() => setCreateChannelModalOpen(false)}
											/>
										</Tabs.Content>
										<Tabs.Content value="create">
											<CreateChannelForm
												onSuccess={() => setCreateChannelModalOpen(false)}
											/>
										</Tabs.Content>
									</Tabs>
								</Dialog.Content>
							</Dialog> */}
						</SidebarGroupAction>
						<SidebarGroupContent>
							<SidebarMenu>
								{/* <Index each={channelsQuery.data?.serverChannels}>
									{(channel) => <ChannelItem channel={channel} />}
								</Index> */}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
						<SidebarGroupAction>{/* <CreateDmDialog /> */}</SidebarGroupAction>
						<SidebarMenu>
							{/* <Index each={dmChannels()}>
									{(channel) => (
										<DmChannelLink
											userPresence={presenceState.presenceList}
											channel={channel}
										/>
									)}
								</Index> */}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	)
}
