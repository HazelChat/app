import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { useParams } from "@tanstack/solid-router"
import { For, createMemo } from "solid-js"
import { IconPin } from "~/components/icons/pin"
import { createMutation } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import { IconCircleXSolid } from "../icons/solid/circle-x-solid"
import { Avatar } from "../ui/avatar"
import { Button } from "../ui/button"
import { Popover } from "../ui/popover"
import { chatMessageStyles } from "./message/message-styles"

export function PinnedModal() {
	const params = useParams({ from: "/_protected/_app/$serverId/chat/$id" })()
	const channelId = createMemo(() => params.id)
	const serverId = createMemo(() => params.serverId)

	const pinnedMessagesQuery = useQuery(() =>
		convexQuery(api.pinnedMessages.getPinnedMessages, {
			channelId: channelId() as Id<"channels">,
			serverId: serverId() as Id<"servers">,
		}),
	)

	const deletePinnedMessageMutation = createMutation(api.pinnedMessages.deletePinnedMessage)

	const sortedPins = createMemo(() =>
		[...(pinnedMessagesQuery.data || [])].sort((a, b) => a.pinnedAt - b.pinnedAt),
	)

	const scrollToMessage = (messageId: string) => {
		const element = document.getElementById(`message-${messageId}`)
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" })

			element.classList.add("bg-primary/30")
			setTimeout(() => {
				element.classList.remove("bg-primary/30")
			}, 1500)
		}
	}

	return (
		<Popover>
			<Popover.Trigger>
				<Button size="square" intent="ghost">
					<IconPin class="size-4" />
				</Button>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Title class="mb-2 flex gap-2">
					<IconPin /> Pinned Messages
				</Popover.Title>
				<div class="flex flex-col gap-2">
					<For each={sortedPins()}>
						{(pinnedMessage) => (
							// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
							<div
								onClick={() => scrollToMessage(pinnedMessage.messageId)}
								class={chatMessageStyles({ variant: "pinned" })}
							>
								<div class="flex gap-3">
									<div class="absolute top-1 right-1 z-10 flex opacity-0 group-hover:opacity-100">
										<Button
											onClick={(e) => {
												e.stopPropagation()
												deletePinnedMessageMutation({
													channelId: channelId() as Id<"channels">,
													messageId: pinnedMessage.messageId,
													serverId: serverId() as Id<"servers">,
												})
											}}
											size="icon-small"
											intent="icon"
											class="group-hover:opacity-100"
										>
											<IconCircleXSolid />
										</Button>
									</div>
									<Avatar
										src={pinnedMessage.messageAuthor.avatarUrl}
										name={pinnedMessage.messageAuthor.displayName!}
									/>
									<div class="min-w-0 flex-1">
										<div class="flex items-baseline gap-2">
											<span class="font-semibold">
												{pinnedMessage.messageAuthor.displayName}
											</span>
											<span class="text-muted-fg text-xs">
												{/* TODO: Add day date here */}
												{new Date(
													pinnedMessage.message._creationTime!,
												).toLocaleTimeString("en-US", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>

										{/* TODO: Add markdown editor here */}
										<p>{(pinnedMessage?.message?.content || "").trim()}</p>
									</div>
								</div>
							</div>
						)}
					</For>
				</div>
			</Popover.Content>
		</Popover>
	)
}
