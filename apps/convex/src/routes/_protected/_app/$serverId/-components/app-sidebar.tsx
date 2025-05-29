import type { Channel, Member } from "@maki-chat/zero"
import { Link, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { type Accessor, Index, createMemo, createSignal } from "solid-js"
import { IconHashtag } from "~/components/icons/hashtag"

import { IconPlusSmall } from "~/components/icons/plus-small"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Dialog } from "~/components/ui/dialog"
import { Sidebar } from "~/components/ui/sidebar"
import { Tabs } from "~/components/ui/tabs"

import { IconAudio } from "~/components/icons/audio"
import { IconMutedAudio } from "~/components/icons/audio-muted"
import { IconHorizontalDots } from "~/components/icons/horizontal-dots"
import { IconPaperPlane } from "~/components/icons/paper-plane"
import { IconPhone } from "~/components/icons/phone"
import { IconSupport } from "~/components/icons/support"
import { IconX } from "~/components/icons/x"
import { Menu } from "~/components/ui/menu"
import { IconSignOut } from "~/components/ui/signout"

import { api } from "convex-hazel/_generated/api"
import type { Id } from "convex-hazel/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import { createMutation, createQuery } from "~/lib/convex"
import { cn } from "~/lib/utils"
import { CreateChannelForm } from "./create-channel-form"
import { CreateDmDialog } from "./create-dm-dialog"
import { JoinPublicChannel } from "./join-public-channel"
import { NavUser } from "./nav-user"
import { WorkspaceSwitcher } from "./workspace-switcher"

export interface SidebarProps {
	class?: string
}

export const AppSidebar = (props: SidebarProps) => {
	const params = useParams({ from: "/_protected/_app/$serverId" })
	const serverId = createMemo(() => params().serverId)

	const channels = createQuery(api.channels.getChannels, {
		serverId: serverId() as Id<"servers">,
	})

	const serverChannels = createMemo(() => channels()?.serverChannels || [])
	const dmChannels = createMemo(() => channels()?.dmChannels || [])

	const [createChannelModalOpen, setCreateChannelModalOpen] = createSignal(false)

	return (
		<Sidebar {...props}>
			<Sidebar.Header>
				<WorkspaceSwitcher />
			</Sidebar.Header>
			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupLabel>Text Channels</Sidebar.GroupLabel>
					<Sidebar.GroupAction>
						<Dialog
							open={createChannelModalOpen()}
							onOpenChange={(details) => setCreateChannelModalOpen(details.open)}
						>
							<Dialog.Trigger
								class="text-muted-foreground"
								asChild={(props) => (
									<Button intent="ghost" size="icon" {...props}>
										<IconPlusSmall />
									</Button>
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
											serverId={serverId}
											onSuccess={() => setCreateChannelModalOpen(false)}
										/>
									</Tabs.Content>
									<Tabs.Content value="create">
										<CreateChannelForm
											serverId={serverId}
											onSuccess={() => setCreateChannelModalOpen(false)}
										/>
									</Tabs.Content>
								</Tabs>
							</Dialog.Content>
						</Dialog>
					</Sidebar.GroupAction>
					<Sidebar.Menu>
						<Index each={serverChannels()}>
							{(channel) => <ChannelItem channel={channel} serverId={serverId} />}
						</Index>
					</Sidebar.Menu>
				</Sidebar.Group>
				<Sidebar.Group>
					<Sidebar.GroupLabel>DM's</Sidebar.GroupLabel>
					<Sidebar.GroupAction>
						<CreateDmDialog serverId={serverId} />
					</Sidebar.GroupAction>
					<Sidebar.Menu>
						<Index each={dmChannels()}>
							{(channel) => <DmChannelLink channel={channel} serverId={serverId} />}
						</Index>
					</Sidebar.Menu>
				</Sidebar.Group>
				<Sidebar.Group class="mt-auto">
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton>
									<IconSupport />
									Support
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
						<Sidebar.Menu>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton>
									<IconPaperPlane />
									Feedback
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</Sidebar.Content>
			<Sidebar.Footer>
				<NavUser serverId={serverId} />
			</Sidebar.Footer>
		</Sidebar>
	)
}

export interface ChannelItemProps {
	channel: Accessor<FunctionReturnType<typeof api.channels.getChannels>["serverChannels"][0]>
	serverId: Accessor<string>
}

export const ChannelItem = (props: ChannelItemProps) => {
	const { userId } = useAuth()
	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel()._id,
	}))

	const leaveChannel = createMutation(api.channels.leaveChannel)

	return (
		<Sidebar.MenuItem>
			<Sidebar.MenuButton
				asChild={(props) => (
					<Link to="/$serverId/chat/$id" params={params()} {...props()}>
						{props().children}
					</Link>
				)}
			>
				<IconHashtag class="size-5 text-muted-foreground" />
				<p
					class={cn(
						"text-ellipsis text-nowrap text-muted-foreground group-hover/sidebar-item:text-foreground",
						props.channel().isMuted && "opacity-60",
					)}
				>
					{props.channel().name}
				</p>
			</Sidebar.MenuButton>
			<Menu positioning={{ placement: "bottom" }}>
				<Menu.Trigger
					asChild={(props) => (
						<Sidebar.MenuAction
							showOnHover
							class="rounded-sm text-foreground data-[state=open]:bg-muted"
							{...props()}
						>
							<IconHorizontalDots class="text-foreground" />
							<span class="sr-only">More</span>
						</Sidebar.MenuAction>
					)}
				/>
				<Menu.Content>
					<MuteMenuItem
						channelId={() => props.channel()._id}
						serverId={props.serverId}
						isMuted={() => props.channel().isMuted}
					/>
					<Menu.Item
						class="flex items-center gap-2 text-destructive"
						value="close"
						onSelect={() => {
							leaveChannel({
								channelId: props.channel()._id as Id<"channels">,
								serverId: props.serverId() as Id<"servers">,
							})
						}}
					>
						<IconSignOut class="size-4" />
						Leave Channel
					</Menu.Item>
				</Menu.Content>
			</Menu>
		</Sidebar.MenuItem>
	)
}

interface DmChannelLinkProps {
	channel: Accessor<FunctionReturnType<typeof api.channels.getChannels>["dmChannels"][0]>
	serverId: Accessor<string>
}

const DmChannelLink = (props: DmChannelLinkProps) => {
	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel()._id,
	}))

	const updateChannelPreferences = createMutation(api.channels.updateChannelPreferences)

	return (
		<Sidebar.MenuItem>
			<Sidebar.MenuButton
				asChild={(parentProps) => (
					<Link to="/$serverId/chat/$id" params={params()} {...parentProps()}>
						{parentProps().children}
					</Link>
				)}
			>
				<div class="-space-x-4 flex items-center justify-center">
					<Index each={props.channel().members}>
						{(member) => (
							<div class="inline-block">
								<Avatar class="size-7" src={member().user.avatarUrl} name={member().user.displayName} />
							</div>
						)}
					</Index>
				</div>
				<p
					class={cn(
						"truncate text-muted-foreground group-hover/sidebar-item:text-foreground",
						props.channel().isMuted && "opacity-60",
					)}
				>
					{props
						.channel()
						.members.map((member) => member.user.displayName)
						.join(", ")}
				</p>
			</Sidebar.MenuButton>

			<Menu positioning={{ placement: "bottom-start" }}>
				<Menu.Trigger
					asChild={(props) => (
						<Sidebar.MenuAction
							showOnHover
							class="rounded-sm text-foreground data-[state=open]:bg-muted"
							{...props()}
						>
							<IconHorizontalDots class="text-foreground" />
							<span class="sr-only">More</span>
						</Sidebar.MenuAction>
					)}
				/>
				<Menu.Content>
					<Menu.Item
						class="flex items-center gap-2"
						value="phone"
						onSelect={() => {
							console.log("TODO: Implement call")
						}}
					>
						<IconPhone class="size-4" />
						Call
					</Menu.Item>
					<Menu.Separator />
					<MuteMenuItem
						channelId={() => props.channel()._id}
						serverId={props.serverId}
						isMuted={() => props.channel().isMuted}
					/>
					<Menu.Item
						class="text-destructive"
						value="close"
						onSelect={async () => {
							await updateChannelPreferences({
								channelId: props.channel()._id as Id<"channels">,
								serverId: props.serverId() as Id<"servers">,
								isHidden: true,
							})
						}}
					>
						<IconX class="size-4" />
						Close
					</Menu.Item>
				</Menu.Content>
			</Menu>
		</Sidebar.MenuItem>
	)
}

const MuteMenuItem = (props: {
	channelId: Accessor<string>
	isMuted: Accessor<boolean>
	serverId: Accessor<string>
}) => {
	const updateChannelPreferences = createMutation(api.channels.updateChannelPreferences)

	return (
		<Menu.Item
			value="mute"
			onSelect={async () => {
				await updateChannelPreferences({
					channelId: props.channelId() as Id<"channels">,
					serverId: props.serverId() as Id<"servers">,
					isMuted: !props.isMuted(),
				})
			}}
		>
			{props.isMuted() ? <IconAudio class="size-4" /> : <IconMutedAudio class="size-4" />}
			{props.isMuted() ? "Unmute" : "Mute"}
		</Menu.Item>
	)
}
