import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { type Accessor, createMemo, For, Match, Show, Suspense, Switch } from "solid-js"
import { Sidebar } from "~/components/ui/sidebar"
import { usePresenceState } from "~/lib/convex-presence"
import { convexQuery } from "~/lib/convex-query"
import { ChannelItem, DmChannelLink } from "./channel-item"

export const SidebarFavoriteGroup = (props: { serverId: Accessor<Id<"servers">> }) => {
	const favoritedChannelsQuery = useQuery(() =>
		convexQuery(api.channels.getChannels, {
			serverId: props.serverId(),
			favoriteFilter: {
				favorite: true,
			},
		}),
	)

	const userPresenceState = usePresenceState()

	const channels = createMemo(() => [
		...(favoritedChannelsQuery.data?.dmChannels || []),
		...(favoritedChannelsQuery.data?.serverChannels || []),
	])

	return (
		<Suspense>
			<Show when={channels().length > 0}>
				<Sidebar.Group>
					<Sidebar.GroupLabel>Favorites</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							<For each={channels()}>
								{(channel) => (
									<Switch>
										<Match when={channel.type === "private" || channel.type === "public"}>
											<ChannelItem channel={() => channel} serverId={props.serverId} />
										</Match>
										<Match when={true}>
											<DmChannelLink
												userPresence={userPresenceState.presenceList}
												channel={() => channel}
												serverId={props.serverId}
											/>
										</Match>
									</Switch>
								)}
							</For>
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</Show>
		</Suspense>
	)
}
