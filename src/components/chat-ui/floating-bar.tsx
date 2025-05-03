import { useAuth } from "clerk-solidjs"
import { twMerge } from "tailwind-merge"
import { useZero } from "~/lib/zero-context"
import { IconButton } from "../icon-button"
import { newId } from "~/lib/id-helpers"

export function FloatingBar(props: { channelId: string }) {
	const auth = useAuth()

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
	)
}

function IconPlus() {
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
