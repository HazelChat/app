import { useNavigate } from "@tanstack/solid-router"
import { type Accessor, For, Show } from "solid-js"
import { IconHashtag } from "~/components/icons/hashtag"

import { usePublicServers } from "~/lib/hooks/data/use-public-servers"
import { useZero } from "~/lib/zero/zero-context"

export interface JoinPublicChannelProps {
	serverId: Accessor<string>
	onSuccess?: () => void
}

export const JoinPublicChannel = (props: JoinPublicChannelProps) => {
	const z = useZero()

	const navigate = useNavigate()

	const { channels: unjoinedChannel } = usePublicServers(props.serverId)

	return (
		<Show
			when={unjoinedChannel().length > 0}
			fallback={<p class="text-muted-foreground">No Channels left to join</p>}
		>
			<For each={unjoinedChannel()}>
				{(channel) => (
					<button
						class="items-2 flex w-full gap-2 rounded-md px-2 py-1 hover:bg-muted"
						type="button"
						onClick={async () => {
							await z.mutate.channelMembers.upsert({
								userId: z.userID,
								channelId: channel.id,
							})

							props.onSuccess?.()
							navigate({
								to: "/$serverId/chat/$id",
								params: { id: channel.id, serverId: props.serverId() },
							})
						}}
					>
						<IconHashtag class="size-5 text-muted-foreground" />
						<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">{channel.name}</p>
					</button>
				)}
			</For>
		</Show>
	)
}
