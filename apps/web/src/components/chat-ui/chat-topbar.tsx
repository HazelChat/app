import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { useParams } from "@tanstack/solid-router"
import { createMemo, For, Index, Match, Show, Suspense, Switch } from "solid-js"
import { convexQuery } from "~/lib/convex-query"
import { useChat } from "../chat-state/chat-store"

import { IconHashtagStroke, IconPhone2, IconSearch1 } from "../iconsv2"
import { Avatar } from "../ui/avatar"
import { Button } from "../ui/button"
import { TextField } from "../ui/text-field"
import { PinnedModal } from "./pinned-modal"

export function ChatTopbar() {
	const params = useParams({ from: "/_protected/_app/$serverId/chat/$id" })()

	const { state } = useChat()

	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: params.serverId as Id<"servers"> }),
	}))

	const channelQuery = useQuery(() =>
		convexQuery(api.channels.getChannel, {
			channelId: state.channelId,
			serverId: params.serverId as Id<"servers">,
		}),
	)

	const filteredMembers = createMemo(
		() => channelQuery.data?.members.filter((member) => member.userId !== meQuery.data?._id) || [],
	)

	return (
		<div class="flex h-16 items-center justify-between gap-2 border-b bg-sidebar p-3">
			<Suspense>
				<Show when={channelQuery.data}>
					{(channel) => (
						<>
							<div class="flex items-center gap-2">
								<Switch>
									<Match when={channel().type === "single" || channel().type === "direct"}>
										<Show when={filteredMembers().length === 1}>
											<Avatar
												size="sm"
												src={filteredMembers()[0].user.avatarUrl}
												name={filteredMembers()[0].user.displayName}
											/>
										</Show>
										<Show when={filteredMembers().length > 1}>
											<div class="-space-x-4 flex items-center justify-center">
												<For each={filteredMembers()}>
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
											{filteredMembers()
												.map((member) => member.user.displayName)
												.join(", ")}
										</p>
									</Match>
									<Match when={channel().type === "private" || channel().type === "public"}>
										<div class="flex items-center gap-1">
											<IconHashtagStroke class="size-5" />
											<p class="max-w-[120px] truncate">{channel()?.name}</p>
										</div>
									</Match>
								</Switch>
							</div>
							<div class="flex gap-2">
								<Button size="square" intent="ghost">
									<IconPhone2 />
								</Button>
								<PinnedModal />
								<Show when={channel().type !== "single" && channel().members.length > 1}>
									<div class="flex items-center">
										<div class="flex items-center gap-2 rounded-md border p-1">
											<div class="-space-x-4 flex items-center justify-center">
												<Index each={filteredMembers().slice(0, 3)}>
													{(member) => (
														<div class="inline-block">
															<Avatar
																class="size-6 rounded-sm"
																src={member().user.avatarUrl}
																name={member().user.displayName}
															/>
														</div>
													)}
												</Index>
											</div>
											<div class="inline-block pr-1 text-muted-foreground text-sm">
												{channelQuery.data?.members?.length}
											</div>
										</div>
									</div>
								</Show>

								<div>
									<TextField
										aria-label="Search"
										placeholder="Search"
										suffix={<IconSearch1 class="mr-2 size-5 text-muted-foreground" />}
									/>
								</div>
							</div>
						</>
					)}
				</Show>
			</Suspense>
		</div>
	)
}
