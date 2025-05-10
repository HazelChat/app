import { Link, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { type Accessor, For, createMemo, createSignal } from "solid-js"
import { IconHashtag } from "~/components/icons/hashtag"
import { useDmChannels } from "~/lib/hooks/data/use-dm-channels"
import { useServerChannels } from "~/lib/hooks/data/use-server-channels"
import type { Channel, Member } from "~/lib/zero/schema"

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

import { useZero } from "~/lib/zero/zero-context"
import { CreateChannelForm } from "./create-channel-form"
import { CreateDmDialog } from "./create-dm-dialog"
import { JoinPublicChannel } from "./join-public-channel"
import { NavUser } from "./nav-user"
import { WorkspaceSwitcher } from "./workspace-switcher"

export interface SidebarProps {
	class?: string
}

export const AppSidebar = (props: SidebarProps) => {
	const params = useParams({ from: "/_app/$serverId" })
	const serverId = createMemo(() => params().serverId)

	const { channels: dmChannels } = useDmChannels(serverId)
	const { channels: serverChannels } = useServerChannels(serverId)

	const { userId } = useAuth()

	const [createChannelModalOpen, setCreateChannelModalOpen] = createSignal(false)

	const computedChannels = createMemo(() => {
		return dmChannels()
			.map((channel) => {
				const friends = channel.users.filter((user) => user.id !== userId())
				const isSingleDm = friends.length === 1

				if (friends.length === 0) return null

				const isMuted = channel.members.some((member) => member.isMuted && member.userId === userId())
				const isHidden = channel.members.some((member) => member.isHidden && member.userId === userId())

				if (isHidden) return null

				return {
					...channel,
					isSingleDm,
					isMuted,
					friends,
				}
			})
			.filter((channel) => channel !== null)
	})

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
						<For each={serverChannels()}>
							{(channel) => <ChannelItem channel={channel} serverId={serverId} />}
						</For>
					</Sidebar.Menu>
				</Sidebar.Group>
				<Sidebar.Group>
					<Sidebar.GroupLabel>DM's</Sidebar.GroupLabel>
					<Sidebar.GroupAction>
						<CreateDmDialog serverId={serverId} />
					</Sidebar.GroupAction>
					<Sidebar.Menu>
						<For each={computedChannels()}>
							{(channel) => <DmChannelLink channel={channel} serverId={serverId} />}
						</For>
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
	channel: Channel & { members: readonly Member[] }
	serverId: Accessor<string>
}

export const ChannelItem = (props: ChannelItemProps) => {
	const z = useZero()
	const { userId } = useAuth()
	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel.id,
	}))

	const leaveChannel = async (channelId: string) => {
		await z.mutate.channelMembers.delete({
			userId: z.userID,
			channelId: channelId,
		})
	}

	const isMuted = createMemo(() =>
		props.channel.members.some((member) => member.isMuted && member.userId === userId()),
	)

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
				<p class="text-ellipsis text-nowrap text-muted-foreground group-hover/sidebar-item:text-foreground">
					{props.channel.name}
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
					<MuteMenuItem channelId={props.channel.id} isMuted={isMuted} />
					<Menu.Item
						class="flex items-center gap-2 text-destructive"
						value="close"
						onSelect={() => {
							leaveChannel(props.channel.id)
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

interface Friend {
	id: string
	avatarUrl: string
	tag: string
	displayName: string
}

interface ComputedChannel {
	id: string
	isMuted: boolean
	friends: Friend[]
}

interface DmChannelLinkProps {
	channel: ComputedChannel
	serverId: Accessor<string>
}

const DmChannelLink = (props: DmChannelLinkProps) => {
	const z = useZero()

	const { userId } = useAuth()

	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel.id,
	}))

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
					<For each={props.channel.friends}>
						{(friend) => (
							<div class="inline-block">
								<Avatar class="size-7" src={friend.avatarUrl} name={friend.displayName} />
							</div>
						)}
					</For>
				</div>
				<p class="truncate text-muted-foreground group-hover/sidebar-item:text-foreground">
					{/* Derive display name directly from props */}
					{props.channel.friends.map((friend) => friend.displayName).join(", ")}
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
					<MuteMenuItem channelId={props.channel.id} isMuted={() => props.channel.isMuted} />
					<Menu.Item
						class="text-destructive"
						value="close"
						onSelect={async () => {
							await z.mutate.channelMembers.update({
								channelId: props.channel.id,
								userId: userId()!,
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

const MuteMenuItem = ({ channelId, isMuted }: { channelId: string; isMuted: Accessor<boolean> }) => {
	const { userId } = useAuth()
	const z = useZero()

	return (
		<Menu.Item
			value="mute"
			onSelect={async () => {
				await z.mutate.channelMembers.update({
					channelId: channelId,
					userId: userId()!,
					isMuted: true,
				})
			}}
		>
			{isMuted() ? <IconAudio /> : <IconMutedAudio class="size-4" />}
			{isMuted() ? "Unmute" : "Mute"}
		</Menu.Item>
	)
}
