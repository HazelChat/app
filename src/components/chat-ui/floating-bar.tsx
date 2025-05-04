import { useAuth } from "clerk-solidjs"
import { Show, createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"
import { useChatMessage } from "~/lib/hooks/data/use-chat-message"
import { newId } from "~/lib/id-helpers"
import { useZero } from "~/lib/zero/zero-context"
import { chatStore$ } from "~/routes/_app/$serverId/chat/$id"
import { IconCirclePlusSolid } from "../icons/solid/circle-plus-solid"
import { IconCircleXSolid } from "../icons/solid/circle-x-solid"
import { Button } from "../ui/button"

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
					"group flex h-12 w-full items-center rounded-sm border border-border bg-sidebar transition duration-300 ease-in hover:border-muted-foreground/70",
				)}
			>
				<Button
					size="icon"
					class="mr-1 ml-2"
					intent="icon"
					// onPress={openFileSelector}
					// isDisabled={isUploading}
				>
					<IconCirclePlusSolid class="size-6!" />
				</Button>

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
			<Button
				size="icon"
				intent="icon"
				onClick={() => setChatStore((prev) => ({ ...prev, replyToMessageId: null }))}
			>
				<IconCircleXSolid />
			</Button>
		</div>
	)
}
