import { createMemo, Show } from "solid-js"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { ChatImage } from "./chat-image"
import { ReactionTags } from "./reaction-tags"
import type { Message } from "~/lib/hooks/data/use-chat-messages"
import { Button } from "../ui/button"
import { UserTag } from "./user-tag"

function extractTextFromJsonNodes(nodes: any[]): string {
	if (!Array.isArray(nodes)) return ""
	return nodes
		.map(
			(node) =>
				(node.type === "text" && node.text) || (node.content && extractTextFromJsonNodes(node.content)) || "",
		)
		.join(" ")
}

function getPlainTextFromContent(content: string): string {
	try {
		const parsed = JSON.parse(content)
		return extractTextFromJsonNodes(parsed.content || [])
	} catch {
		return content.replace(/<[^>]*>/g, "")
	}
}

export function ChatMessage(props: { message: Message, isLastMessage: boolean, isGroupStart: boolean, isGroupEnd: boolean }) {
	const showAvatar = props.isGroupStart

	const messageTime = createMemo(() => {
		return new Date(props.message.createdAt!).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
	})

	const attachedCount = createMemo(() => {
		return props.message.attachedFiles?.length ?? 0
	})

	const itemClass = createMemo(() => twMerge(
		"relative overflow-hidden rounded-md",
		attachedCount() === 1 ? "max-h-[300px]" : attachedCount() === 2 ? "aspect-video" : "aspect-square",
	))

	return <div class={chatMessageStyles({
		isGettingRepliedTo: false,
		isGroupStart: props.isGroupStart,
		isGroupEnd: props.isGroupEnd,
	})}>
		<Show when={props.message.replyToMessageId}>
			<Button class="flex items-center gap-1 pl-12 text-left w-fit" intent="ghost">
				<Avatar class="w-4 h-4">
					<AvatarImage src={props.message.replyToMessage?.author?.avatarUrl} />
					<AvatarFallback>
						{props.message.replyToMessage?.author?.displayName.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
				<UserTag user={props.message.replyToMessage?.author!} />
				<span class="text-ellipsis text-foreground text-xs">
					{getPlainTextFromContent(props.message.replyToMessage?.content ?? "")}
				</span>
			</Button>
		</Show>
		<div class="flex gap-4">
			<Show when={showAvatar}>
				<Avatar>
					<AvatarImage src={props.message.author?.avatarUrl} />
					<AvatarFallback>
						{props.message.author?.displayName.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
			</Show>
			<Show when={!showAvatar}>
				<div class="w-10 items-center justify-end pr-1 text-[10px] text-muted-foreground leading-tight opacity-0 group-hover:opacity-100">
					{messageTime()}
				</div>
			</Show>
			<div class="min-w-0 flex-1">
				<Show when={showAvatar}>
					<div class="flex items-baseline gap-2">
						<span class="font-semibold">{props.message.author?.displayName}</span>
						<span class="text-muted-foreground text-xs">{messageTime()}</span>
					</div>
				</Show>
				{/* TODO: This should be a markdown viewer */}
				<p class="text-sm">{props.message.content}</p>
				<div class="flex flex-col gap-2 pt-2">
					<Show when={attachedCount() > 0}>
						<div class={twMerge(
							"mt-2",
							attachedCount() === 1
								? "flex max-w-[400px]"
								: `grid grid-cols-${attachedCount() === 3 ? 3 : 2} max-w-lg`,
							"gap-1",
						)}
						>
							{props.message.attachedFiles?.slice(0, 4).map((file) => (
								<div class={itemClass()}>
									<ChatImage src={`${import.meta.env.VITE_BUCKET_URL}/${file}`} alt={file} />
								</div>
							))}
						</div>
					</Show>
					<ReactionTags message={props.message} />
				</div>
			</div>
		</div>
	</div>
}

export const chatMessageStyles = tv({
	base: "group relative flex flex-col px-4 py-1 transition-colors hover:bg-muted/50",
	variants: {
		variant: {
			chat: "rounded-l-none",
			pinned: "border p-3",
		},
		isGettingRepliedTo: {
			true: "border-primary border-l-2 bg-primary/20 hover:bg-primary/15",
			false: "",
		},
		isGroupStart: {
			true: "mt-2",
			false: "",
		},
		isGroupEnd: {
			true: "mb-2",
			false: "",
		},
	},
	defaultVariants: {
		variant: "chat",
	},
})
