import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import { type Accessor, For, Show, createMemo } from "solid-js"
import { IconHashtag } from "~/components/icons/hashtag"
import { createMutation } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"

export interface JoinPublicChannelProps {
	serverId: Accessor<Id<"servers">>
	onSuccess?: () => void
}

export const JoinPublicChannel = (props: JoinPublicChannelProps) => {
	const navigate = useNavigate()

	const unjoinedChannelsQuery = useQuery(() =>
		convexQuery(api.channels.getUnjoinedPublicChannels, {
			serverId: props.serverId(),
		}),
	)

	const computedUnjoinedChannels = createMemo(() => unjoinedChannelsQuery.data || [])

	const joinChannel = createMutation(api.channels.joinChannel)

	return (
		<Show
			when={computedUnjoinedChannels().length > 0}
			fallback={<p class="text-muted-foreground">No Channels left to join</p>}
		>
			<For each={computedUnjoinedChannels()}>
				{(channel) => (
					<button
						class="items-2 flex w-full gap-2 rounded-md px-2 py-1 hover:bg-muted"
						type="button"
						onClick={async () => {
							await joinChannel({
								channelId: channel._id as Id<"channels">,
								serverId: props.serverId() as Id<"servers">,
							})

							props.onSuccess?.()
							navigate({
								to: "/$serverId/chat/$id",
								params: { id: channel._id, serverId: props.serverId() },
							})
						}}
					>
						<IconHashtag class="size-5 text-muted-foreground" />
						<p class="text-muted-foreground group-hover/sidebar-item:text-foreground">
							{channel.name}
						</p>
					</button>
				)}
			</For>
		</Show>
	)
}
