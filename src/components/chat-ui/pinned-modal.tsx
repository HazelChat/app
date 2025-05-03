import { useParams } from "@tanstack/solid-router"
import { createMemo, For } from "solid-js"
import { usePinnedMessages } from "~/lib/hooks/data/use-pinned-messages"
import { useZero } from "~/lib/zero-context"
import { Popover } from "../ui/popover"
import { Button } from "../ui/button"
import { chatMessageStyles, IconPin2 } from "./chat-message"
import { IconCircleXFill } from "./floating-bar"
import { Avatar } from "../ui/avatar"

export function PinnedModal() {
	const z = useZero()
	const params = useParams({ from: "/_app/$serverId/chat/$id" })()
	const channelId = createMemo(() => params.id)

	const pinnedMessages = usePinnedMessages(channelId)

	const scrollToMessage = (messageId: string) => {
		const element = document.getElementById(messageId)
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" })

			element.classList.add("bg-primary/20")
			setTimeout(() => {
				element.classList.remove("bg-primary/20")
			}, 1500)
		}
	}

	return (
		<Popover>
			<Popover.Trigger>
				<Button>
					<IconPin2 class="size-4" />
				</Button>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Title class="mb-2 flex gap-2">
					<IconPin2 /> Pinned Messages
				</Popover.Title>
				<div class="flex flex-col gap-2">
					<For each={pinnedMessages.pinnedMessages()}>
						{(pinnedMessage) => (
							// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
							<div
								onClick={() => scrollToMessage(pinnedMessage.messageId)}
								class={chatMessageStyles({ variant: "pinned" })}
							>
								<div class="flex gap-3">
									<div class="absolute top-0 right-0 z-10 flex opacity-0 group-hover:opacity-100">
										<Button
											onClick={() => {
												z.mutate.pinnedMessages.delete({
													id: pinnedMessage.id,
												})
											}}
											size="icon"
											intent="ghost"
											class="group-hover:opacity-100"
										>
											<IconCircleXFill />
										</Button>
									</div>
									<Avatar>
										<Avatar.Image src={pinnedMessage?.message?.author?.avatarUrl} />
									</Avatar>
									<div class="min-w-0 flex-1">
										<div class="flex items-baseline gap-2">
											<span class="font-semibold">
												{pinnedMessage?.message?.author?.displayName}
											</span>
											<span class="text-muted-fg text-xs">
												{new Date(pinnedMessage?.message?.createdAt!).toLocaleTimeString(
													"en-US",
													{
														hour: "2-digit",
														minute: "2-digit",
													},
												)}
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
