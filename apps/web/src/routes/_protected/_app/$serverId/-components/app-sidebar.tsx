import { Link, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { type Accessor, Index, Match, Switch, createEffect, createMemo, createSignal } from "solid-js"
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

import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import type { FunctionReturnType } from "convex/server"
import { UserAvatar } from "~/components/ui/user-avatar"
import { createMutation } from "~/lib/convex"
import createPresence from "~/lib/convex-presence2"
import { convexQuery } from "~/lib/convex-query"
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
	const serverId = createMemo(() => params().serverId as Id<"servers">)

	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: serverId() }),
	}))

	const channelsQuery = useQuery(() => convexQuery(api.channels.getChannels, { serverId: serverId() }))

	const serverChannels = createMemo(() => channelsQuery.data?.serverChannels || [])
	const dmChannels = createMemo(() => channelsQuery.data?.dmChannels || [])

	const [createChannelModalOpen, setCreateChannelModalOpen] = createSignal(false)

	const presenceState = createPresence(serverId, () => meQuery.data?._id!)

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
							{(channel) => (
								<DmChannelLink
									userPresence={presenceState}
									channel={channel}
									serverId={serverId}
								/>
							)}
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
	serverId: Accessor<Id<"servers">>
	userPresence: Accessor<
		{
			userId: string
			online: boolean
			lastDisconnected: number
		}[]
	>
}

const DmChannelLink = (props: DmChannelLinkProps) => {
	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: props.serverId() }),
	}))

	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel()._id,
	}))

	const updateChannelPreferences = createMutation(api.channels.updateChannelPreferences)

	const filteredMembers = createMemo(() =>
		props.channel().members.filter((member) => member.userId !== meQuery.data?._id),
	)

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
					<Switch>
						<Match when={props.channel().type === "single" && filteredMembers().length === 1}>
							<div class="flex items-center justify-center gap-3">
								<UserAvatar
									avatarUrl={filteredMembers()[0].user.avatarUrl}
									displayName={filteredMembers()[0].user.displayName}
									status={
										props
											.userPresence()
											.find((p) => p.userId === filteredMembers()[0].user._id)?.online
											? "online"
											: "offline"
									}
								/>

								<p
									class={cn(
										"truncate text-muted-foreground group-hover/sidebar-item:text-foreground",
										props.channel().isMuted && "opacity-60",
									)}
								>
									{filteredMembers()[0].user.displayName}
								</p>
							</div>
						</Match>
						<Match when={true}>
							<div class="-space-x-4 flex items-center justify-center">
								<Index each={filteredMembers()}>
									{(member) => (
										<div class="inline-block">
											<Avatar
												class="size-7"
												src={member().user.avatarUrl}
												name={member().user.displayName}
											/>
										</div>
									)}
								</Index>
								<p
									class={cn(
										"truncate text-muted-foreground group-hover/sidebar-item:text-foreground",
										props.channel().isMuted && "opacity-60",
									)}
								>
									{filteredMembers()
										.map((member) => member.user.displayName)
										.join(", ")}
								</p>
							</div>
						</Match>
					</Switch>
				</div>
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
