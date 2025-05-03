import { Link, useNavigate, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { For, createMemo } from "solid-js"
import { useDmChannels } from "~/lib/hooks/data/use-dm-channels"
import { useServerChannels } from "~/lib/hooks/data/use-server-channels"
import type { Channel } from "~/lib/schema"
import { IconHashtag } from "./icons/hashtag"
import { IconPlus } from "./icons/plus"
import { IconPlusSmall } from "./icons/plus-small"
import { Avatar } from "./ui/avatar"
import { Button } from "./ui/button"
import { Dialog } from "./ui/dialog"
import { Sidebar } from "./ui/sidebar"
import { Tabs } from "./ui/tabs"

export interface SidebarProps {
	class?: string
}

export const AppSidebar = (props: SidebarProps) => {
	const params = useParams({ from: "/_app/$serverId" })
	const serverId = createMemo(() => params().serverId)

	const { channels: dmChannels } = useDmChannels(serverId)
	const { channels: serverChannels } = useServerChannels(serverId)

	const { userId } = useAuth()
	const navigate = useNavigate()

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
			<Sidebar.Group
				title="Text Channels"
				action={
					<Dialog>
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
									<p>Public Content</p>
								</Tabs.Content>
								<Tabs.Content value="create">
									<p>Private Content</p>
								</Tabs.Content>
							</Tabs>
						</Dialog.Content>
					</Dialog>
				}
			>
				<For each={serverChannels()}>
					{(channel) => <ChannelItem channel={channel} serverId={serverId()} />}
				</For>
			</Sidebar.Group>
			<Sidebar.Group
				title="DM's"
				action={
					<Dialog>
						<Dialog.Trigger
							class="text-muted-foreground"
							asChild={(props) => (
								<Button intent="ghost" size="icon" {...props}>
									<IconPlusSmall />
								</Button>
							)}
						/>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Add Direct Message</Dialog.Title>
								<Dialog.Description>
									Enter the username of the person you want to message.
								</Dialog.Description>
							</Dialog.Header>
						</Dialog.Content>
					</Dialog>
				}
			>
				<For each={computedChannels()}>
					{(channel) => <DmChannelLink channel={channel} serverId={serverId()} />}
				</For>
			</Sidebar.Group>
		</Sidebar>
	)
}

export interface ChannelItemProps {
	channel: Channel
	serverId: string
}

export const ChannelItem = (props: ChannelItemProps) => {
	return (
		<Link to="/$serverId/chat/$id" params={{ serverId: props.serverId, id: props.channel.id }}>
			<Sidebar.Item>
				<IconHashtag class="size-5 text-muted-foreground" />
				<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">{props.channel.name}</p>
			</Sidebar.Item>
		</Link>
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
	serverId: string
}

const DmChannelLink = (props: DmChannelLinkProps) => {
	return (
		<Link to="/$serverId/chat/$id" params={{ serverId: props.serverId, id: props.channel.id }}>
			<Sidebar.Item>
				<div class="-space-x-4 flex items-center justify-center">
					<For each={props.channel.friends}>
						{(friend) => (
							<div class="inline-block">
								<Avatar class="size-7">
									<Avatar.Image src={friend.avatarUrl} alt={friend.tag} />
									<Avatar.Fallback>{friend.displayName}</Avatar.Fallback>
								</Avatar>
							</div>
						)}
					</For>
				</div>
				<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">
					{/* Derive display name directly from props */}
					{props.channel.friends.map((friend) => friend.displayName).join(", ")}
				</p>
			</Sidebar.Item>
		</Link>
	)
}
