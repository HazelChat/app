import { createListCollection } from "@ark-ui/solid"
import { useNavigate } from "@tanstack/solid-router"
import { type Accessor, For, Index, createMemo, createSignal } from "solid-js"
import { IconPlusSmall } from "~/components/icons/plus-small"
import { Avatar } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Dialog } from "~/components/ui/dialog"
import { ListBox } from "~/components/ui/list-box"
import { TextField } from "~/components/ui/text-field"

import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { createMutation } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"

export interface CreateDmDialogProps {
	serverId: Accessor<Id<"servers">>
}

export const CreateDmDialog = (props: CreateDmDialogProps) => {
	const friendsQuery = useQuery(() => convexQuery(api.social.getFriends, { serverId: props.serverId() }))

	const createDmChannelMutation = createMutation(api.channels.createChannel)

	const [friendFilter, setFriendFilter] = createSignal<string>("")

	const [isDialogOpen, setDialogOpen] = createSignal(false)

	const navigate = useNavigate()

	const filteredFriends = createMemo(() => {
		const initalFriends = friendsQuery.data

		if (!initalFriends) return []

		if (friendFilter() === "") {
			return initalFriends
		}
		return initalFriends.filter(
			(friend) =>
				friend.displayName.toLowerCase().includes(friendFilter().toLowerCase()) ||
				friend.tag.includes(friendFilter().toLowerCase()),
		)
	})

	const friendCollection = createMemo(() =>
		createListCollection({
			items: filteredFriends(),
			itemToString: (item) => item.displayName,
			itemToValue: (item) => item.tag,
		}),
	)

	const [selectFriends, setSelectedFriends] = createSignal<Doc<"users">[]>([])

	return (
		<Dialog open={isDialogOpen()} onOpenChange={(details) => setDialogOpen(details.open)}>
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
					<Dialog.Title>Select friends</Dialog.Title>
					<Dialog.Description>
						You can add {10 - selectFriends().length} more friends to this DM.
					</Dialog.Description>
				</Dialog.Header>
				<div class="flex flex-col gap-2">
					<div class="flex w-full flex-wrap gap-2 overflow-hidden">
						<For each={selectFriends()}>{(friend) => <Badge>{friend.displayName}</Badge>}</For>
					</div>
					<TextField
						placeholder="Search friends"
						value={friendFilter()}
						onInput={(e) => {
							setFriendFilter(e.target.value)
						}}
					/>
					<ListBox
						id="friendList"
						collection={friendCollection()}
						value={selectFriends().map((friend) => friend.tag)}
						onValueChange={(e: any) => {
							setSelectedFriends(e.items)
						}}
						selectionMode="multiple"
						loopFocus
					>
						<ListBox.Content class="border-none">
							<Index each={friendCollection().items}>
								{(item) => (
									<ListBox.Item item={item()}>
										<div class="flex items-center gap-3">
											<Avatar
												size="xs"
												src={item().avatarUrl}
												name={item().displayName}
											/>
											<ListBox.ItemText>{item().displayName}</ListBox.ItemText>
										</div>

										<ListBox.ItemIndicator />
									</ListBox.Item>
								)}
							</Index>
						</ListBox.Content>
					</ListBox>
				</div>
				<Dialog.Footer>
					<Button
						intent="default"
						onClick={async () => {
							const channelId = await createDmChannelMutation({
								serverId: props.serverId() as Id<"servers">,
								userIds: selectFriends().map((friend) => friend._id as Id<"users">),
								type: "direct",
								name: "Dm Channel",
							})

							setDialogOpen(false)

							setSelectedFriends([])
							setFriendFilter("")

							navigate({
								to: "/$serverId/chat/$id" as const,
								params: { id: channelId, serverId: props.serverId() },
							})
						}}
					>
						Create DM
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
