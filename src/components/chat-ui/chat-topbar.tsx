import { useQuery } from "@rocicorp/zero/solid"
import { useParams } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { For, Show, createMemo } from "solid-js"
import { useZero } from "~/lib/zero-context"
import { IconGroup } from "../icons/group"
import { IconPhone } from "../icons/phone"
import { IconSearch } from "../icons/search"
import { IconUserPlus } from "../icons/user-plus"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { TextField } from "../ui/text-field"
import { PinnedModal } from "./pinned-modal"

export function ChatTopbar() {
	const params = useParams({ from: "/_app/$serverId/chat/$id" })()
	const z = useZero()

	const { userId } = useAuth()

	const [channel] = useQuery(() => z.query.serverChannels.where("id", "=", params.id).related("users").one())

	if (!channel) {
		return null
	}

	const friends = createMemo(() => channel()?.users.filter((user) => user.id !== userId()) ?? [])
	const isSingleDm = createMemo(() => friends().length === 1)

	return (
		<div class="flex h-16 items-center justify-between gap-2 border-b bg-sidebar p-3">
			<div class="flex items-center gap-2">
				<Show when={isSingleDm()}>
					<Avatar>
						<AvatarImage src={friends()[0].avatarUrl} alt={friends()[0].displayName} />
						<AvatarFallback>{friends()[0].displayName.slice(0, 2)}</AvatarFallback>
					</Avatar>
				</Show>
				<Show when={!isSingleDm()}>
					<div class="-space-x-4 flex items-center justify-center">
						<For each={friends()}>
							{(friend) => (
								<Avatar>
									<AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
									<AvatarFallback>{friend.displayName.slice(0, 2)}</AvatarFallback>
								</Avatar>
							)}
						</For>
					</div>
				</Show>
				<p class="text-sidebar-fg">
					{friends()
						.map((friend) => friend.displayName)
						.join(", ")}
				</p>
			</div>
			<div class="flex gap-2">
				<Button size="icon" intent="ghost">
					<IconPhone />
				</Button>
				<PinnedModal />
				<Button size="icon" intent="ghost">
					<IconUserPlus />
				</Button>
				<Button size="icon" intent="ghost">
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
		</div>
	)
}
