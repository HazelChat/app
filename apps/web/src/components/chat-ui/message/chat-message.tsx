import { type Accessor, Show, createEffect, createMemo } from "solid-js"

import { Badge } from "~/components/ui/badge"

import type { Id } from "@hazel/backend"
import { useChat } from "~/components/chat-state/chat-store"
import type { Message } from "~/lib/types"
import { MessageActions } from "./message-actions"
import { MessageContent } from "./message-content"
import { MessageHeader } from "./message-header"
import { MessageReply } from "./message-reply"
import { chatMessageStyles } from "./message-styles"

interface ChatMessageProps {
	serverId: Accessor<Id<"servers">>
	message: Accessor<Message>
	isGroupStart: Accessor<boolean>
	isGroupEnd: Accessor<boolean>
	isFirstNewMessage: Accessor<boolean>
	isThread: boolean
}

export function ChatMessage(props: ChatMessageProps) {
	const isRepliedTo = createMemo(() => !!props.message().replyToMessageId)
	const showAvatar = createMemo(() => props.isGroupStart() || isRepliedTo())

	const { state } = useChat()

	const messageId = createMemo(() => props.message()._id)

	const isPinned = () =>
		state.channel?.pinnedMessages.find((m) => m.messageId === messageId()) !== undefined

	const scrollToMessage = (id: string) => {
		const el = document.getElementById(`message-${id}`)
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" })
			el.classList.add("bg-primary/20")
			setTimeout(() => el.classList.remove("bg-primary/20"), 1500)
		}
	}

	createEffect(async () => {
		if (props.isFirstNewMessage()) {
			console.log("TODO: Implement setting lastSeenMessageId to null")
			// await z.mutate.channelMembers.update({
			// 	channelId: props.message().channelId!,
			// 	userId: z.userID,
			// 	lastSeenMessageId: null,
			// 	notificationCount: 0,
			// })
		}
	})

	return (
		<div
			id={`message-${props.message()._id}`}
			class={chatMessageStyles({
				isGettingRepliedTo: false,
				isGroupStart: props.isGroupStart(),
				isGroupEnd: props.isGroupEnd(),
				isFirstNewMessage: props.isFirstNewMessage(),
				isPinned: isPinned(),
				class: "rounded-l-none",
			})}
			data-id={props.message()._id}
		>
			<Show when={props.isFirstNewMessage()}>
				<div class="absolute top-1 right-1 z-10">
					<Badge class="text-[10px]">New Message</Badge>
				</div>
			</Show>

			<Show when={isRepliedTo()}>
				<MessageReply message={props.message} onReplyClick={scrollToMessage} />
			</Show>

			<div class="flex gap-4">
				<MessageActions
					message={props.message}
					serverId={props.serverId}
					isPinned={isPinned}
					isThread={props.isThread}
				/>

				<MessageHeader message={props.message} showAvatar={showAvatar} serverId={props.serverId} />

				<MessageContent message={props.message} serverId={props.serverId} showAvatar={showAvatar} />
			</div>
		</div>
	)
}
