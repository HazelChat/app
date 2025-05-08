import { Link, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { type Accessor, For, createMemo, createSignal } from "solid-js"
import { IconHashtag } from "~/components/icons/hashtag"
import { useDmChannels } from "~/lib/hooks/data/use-dm-channels"
import { useServerChannels } from "~/lib/hooks/data/use-server-channels"
import type { Channel } from "~/lib/zero/schema"

import { IconPlusSmall } from "~/components/icons/plus-small"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Dialog } from "~/components/ui/dialog"
import { Sidebar } from "~/components/ui/sidebar"
import { Tabs } from "~/components/ui/tabs"

import { CreateChannelForm } from "./create-channel-form"
import { CreateDmDialog } from "./create-dm-dialog"
import { JoinPublicChannel } from "./join-public-channel"

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

				return {
					...channel,
					isSingleDm,
					friends,
				}
			})
			.filter((channel) => channel !== null)
	})

	return (
		<Sidebar {...props}>
			<Sidebar.Header>
				<Button>Hello</Button>
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
			</Sidebar.Content>
		</Sidebar>
	)
}

export interface ChannelItemProps {
	channel: Channel
	serverId: Accessor<string>
}

export const ChannelItem = (props: ChannelItemProps) => {
	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel.id,
	}))
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
	friends: Friend[]
}

interface DmChannelLinkProps {
	channel: ComputedChannel
	serverId: Accessor<string>
}

const DmChannelLink = (props: DmChannelLinkProps) => {
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
		</Sidebar.MenuItem>
	)
}
