import { useParams } from "@tanstack/solid-router"
import { api } from "convex-hazel/_generated/api"
import type { Id } from "convex-hazel/_generated/dataModel"
import { For, Match, Show, Switch } from "solid-js"
import { createQuery } from "~/lib/convex"
import { useChat } from "../chat-state/chat-store"
import { IconGroup } from "../icons/group"
import { IconHashtag } from "../icons/hashtag"
import { IconPhone } from "../icons/phone"
import { IconSearch } from "../icons/search"
import { IconUserPlus } from "../icons/user-plus"
import { Avatar } from "../ui/avatar"
import { Button } from "../ui/button"
import { TextField } from "../ui/text-field"
import { PinnedModal } from "./pinned-modal"

export function ChatTopbar() {
	const params = useParams({ from: "/_protected/_app/$serverId/chat/$id" })()

	const { state } = useChat()

	const { data: channel } = createQuery(api.channels.getChannel, {
		channelId: state.channelId,
		serverId: params.serverId as Id<"servers">,
	})

	return (
		<div class="flex h-16 items-center justify-between gap-2 border-b bg-sidebar p-3">
			<Show when={channel()}>
				{(channel) => (
					<>
						<div class="flex items-center gap-2">
							<Switch>
								<Match when={channel().type === "single" || channel().type === "direct"}>
									<Show when={channel().members.length === 1}>
										<Avatar
											size="sm"
											src={channel().members[0].user.avatarUrl}
											name={channel().members[0].user.displayName}
										/>
									</Show>
									<Show when={channel().members.length > 1}>
										<div class="-space-x-4 flex items-center justify-center">
											<For each={channel().members}>
												{(member) => (
													<Avatar
														class="ring-background"
														size="sm"
														src={member.user.avatarUrl}
														name={member.user.displayName}
													/>
												)}
											</For>
										</div>
									</Show>
									<p class="max-w-[120px] truncate text-sidebar-fg">
										{channel()
											.members.map((member) => member.user.displayName)
											.join(", ")}
									</p>
								</Match>
								<Match when={channel().type === "private" || channel().type === "public"}>
									<div class="flex items-center gap-1">
										<IconHashtag class="size-5" />
										<p class="max-w-[120px] truncate">{channel()?.name}</p>
									</div>
								</Match>
							</Switch>
						</div>
						<div class="flex gap-2">
							<Button size="square" intent="ghost">
								<IconPhone />
							</Button>
							<PinnedModal />
							<Button size="square" intent="ghost">
								<IconUserPlus />
							</Button>
							<Button size="square" intent="ghost">
								<IconGroup />
							</Button>
							<div>
								<TextField
									aria-label="Search"
									placeholder="Search"
									suffix={<IconSearch class="mr-2 size-5 text-muted-foreground" />}
								/>
							</div>
						</div>
					</>
				)}
			</Show>
		</div>
	)
}
