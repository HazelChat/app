import { Link, useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { For, Show, createMemo } from "solid-js"
import { useDmChannels } from "~/lib/hooks/data/use-dm-channels"
import { IconHashtag } from "./icons/hashtag"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export const Sidebar = () => {
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
		<ul class="flex flex-col gap-3">
			<For each={computedChannels()}>
				{(channel) => (
					<Link to="/$serverId/chat/$id" params={{ serverId: serverId(), id: channel.id }}>
						<li class="group/sidebar-item flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
							<div class="-space-x-4 flex items-center justify-center">
								<For each={channel.friends}>
									{(friend) => (
										<div class="inline-block">
											<Avatar>
												<AvatarImage src={friend.avatarUrl} alt={friend.tag} />
												<AvatarFallback>{friend.displayName}</AvatarFallback>
											</Avatar>
										</div>
									)}
								</For>
							</div>

							<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">
								{channel.friends.map((friend) => friend.displayName).join(", ")}
							</p>
						</li>
					</Link>
				)}
			</For>
		</ul>
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
