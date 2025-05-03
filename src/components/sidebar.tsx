import { Link, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { For, createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"
import { useDmChannels } from "~/lib/hooks/data/use-dm-channels"
import { IconHashtag } from "./icons/hashtag"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export interface SidebarProps {
	class?: string
}

export const Sidebar = (props: SidebarProps) => {
	const params = useParams({ from: "/_app/$serverId" })
	const serverId = createMemo(() => params().serverId)

	const { channels } = useDmChannels(serverId)

	const { userId } = useAuth()

	const computedChannels = createMemo(() => {
		return channels()
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
		<div class={twMerge("flex h-full flex-col bg-sidebar px-2 py-3 text-sidebar-foreground", props.class)}>
			<ul class="flex flex-col gap-3">
				<For each={computedChannels()}>
					{(channel) => <ChannelLink channel={channel} serverId={serverId()} />}
				</For>
			</ul>
		</div>
	)
}

export const SidebarItem = () => {
	return <li class="flex flex-col gap-3 hover:bg-mu">WOW</li>
}

export interface ChannelItemProps {
	name: string
}

export const ChannelItem = (props: ChannelItemProps) => {
	return (
		<li class="group/sidebar-item flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
			<IconHashtag class="size-5 text-muted-foreground" />
			<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">{props.name}</p>
		</li>
	)
}

// Define types for props for better clarity
interface Friend {
	id: string // Assuming id is string
	avatarUrl: string
	tag: string
	displayName: string
}

interface Channel {
	id: string
	friends: Friend[]
}

interface ChannelLinkProps {
	channel: Channel
	serverId: string
}

const ChannelLink = (props: ChannelLinkProps) => {
	return (
		<Link to="/$serverId/chat/$id" params={{ serverId: props.serverId, id: props.channel.id }}>
			<li class="group/sidebar-item flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
				<div class="-space-x-4 flex items-center justify-center">
					<For each={props.channel.friends}>
						{(friend) => (
							<div class="inline-block">
								<Avatar class="size-7">
									<AvatarImage src={friend.avatarUrl} alt={friend.tag} />
									<AvatarFallback>{friend.displayName}</AvatarFallback>
								</Avatar>
							</div>
						)}
					</For>
				</div>
				<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">
					{/* Derive display name directly from props */}
					{props.channel.friends.map((friend) => friend.displayName).join(", ")}
				</p>
			</li>
		</Link>
	)
}

export default ChannelLink
