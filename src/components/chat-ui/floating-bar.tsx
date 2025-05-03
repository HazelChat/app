import { useAuth } from "clerk-solidjs"
import { twMerge } from "tailwind-merge"
import { useZero } from "~/lib/zero-context"
import { IconButton } from "../icon-button"
import { newId } from "~/lib/id-helpers"
import { createMemo, Show } from "solid-js"
import { useChatMessage } from "~/lib/hooks/data/use-chat-message"
import { chatStore$ } from "~/routes/_app/$serverId/chat/$id"

export function FloatingBar(props: { channelId: string }) {
	const auth = useAuth()
	const [chatStore] = chatStore$

	const z = useZero()

	async function handleSubmit(text: string) {
		if (!auth.userId()) return
		if (text.trim().length === 0) return
		const content = text.trim()

		await z.mutate.messages.insert({
			channelId: props.channelId,
			id: newId("messages"),
			content: content,
			authorId: auth.userId()!,
			createdAt: new Date().getTime(),
			replyToMessageId: null,
			parentMessageId: null,
			attachedFiles: [],
		})
	}

	return (
		<div>
			<Show when={chatStore().replyToMessageId}>
				<ReplyInfo replyToMessageId={chatStore().replyToMessageId} />
			</Show>
			<div
				class={twMerge(
					"group flex w-full items-center rounded-sm border border-border/90 bg-secondary transition hover:border-border/90",
				)}
			>
				<IconButton
					class="mr-1 ml-2"
					// onPress={openFileSelector}
					// isDisabled={isUploading}
				>
					<IconPlus />
				</IconButton>

				<div class="w-full">
					<input
						class="w-full"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleSubmit(e.currentTarget.value)
							}
						}}
					/>
				</div>
			</div>
		</div>
	)
}

export function IconPlus() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-plus-icon lucide-plus"
		>
			<path d="M5 12h14" />
			<path d="M12 5v14" />
		</svg>
	)
}

function ReplyInfo(props: {
	replyToMessageId: string | null
	// showAttachmentArea: boolean
}) {
	const message = createMemo(() => {
		return useChatMessage(props.replyToMessageId!)
	})

	if (!message()?.messages()) return null

	const [chatStore, setChatStore] = chatStore$

	return (
		<div
			class={twMerge(
				"flex items-center justify-between gap-2 rounded-sm rounded-b-none border border-border/90 border-b-0 bg-secondary/90 px-2 py-1 text-muted-fg text-sm transition hover:border-border/90",
				// showAttachmentArea && "rounded-t-none",
			)}
		>
			<p>
				Replying to <span class="font-semibold text-fg">{message()!.messages()!.author?.displayName}</span>
			</p>
			<IconButton onClick={() => setChatStore((prev) => ({ ...prev, replyToMessageId: null }))}>
				<IconCircleXFill />
			</IconButton>
		</div>
	)
}

export function IconCircleXFill() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-circle-x-fill lucide-circle-x-fill"
		>
			<path d="M18 6L6 18" />
			<path d="M6 6l12 12" />
		</svg>
	)
}
