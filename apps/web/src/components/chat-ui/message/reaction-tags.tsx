import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { type Accessor, createMemo, createSignal, For, Show } from "solid-js"
import { useChat } from "~/components/chat-state/chat-store"
import { IconEmojiAdd } from "~/components/icons/emoji-add"
import { Button } from "~/components/ui/button"
import { Popover } from "~/components/ui/popover"
import { createMutation, optimisticAddReaction, optimisticRemoveReaction } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import { EmojiPicker } from "./emoji-picker"

type MessageReaction = {
	emoji: string
	userId: string
}

type ReactionTagsProps = {
	message: Accessor<Doc<"messages">>
}

export function ReactionTags(props: ReactionTagsProps) {
	const { state } = useChat()

	const [openPopover, setOpenPopover] = createSignal(false)

	const meQuery = useQuery(() => convexQuery(api.me.getUser, { serverId: state.serverId }))

	const reactionGroups = createMemo(() => {
		const groups: Record<string, { emoji: string; reactions: MessageReaction[] }> = {}
		for (const reaction of props.message().reactions) {
			if (!groups[reaction.emoji]) {
				groups[reaction.emoji] = { emoji: reaction.emoji, reactions: [] }
			}
			groups[reaction.emoji].reactions.push(reaction)
		}
		return Object.values(groups)
	})

	const currentSelectedEmojis = createMemo(() => {
		return props.message().reactions.filter((reaction) => reaction.userId === meQuery.data?._id)
	})

	const removeReaction = createMutation(api.messages.deleteReaction).withOptimisticUpdate((store, args) => {
		const userId = meQuery.data?._id
		if (!userId) return
		optimisticRemoveReaction(store, {
			serverId: args.serverId as Id<"servers">,
			channelId: props.message().channelId as Id<"channels">,
			messageId: args.id as Id<"messages">,
			emoji: args.emoji,
			userId,
		})
	})

	const addReaction = createMutation(api.messages.createReaction).withOptimisticUpdate((store, args) => {
		const userId = meQuery.data?._id
		if (!userId) return
		optimisticAddReaction(store, {
			serverId: args.serverId as Id<"servers">,
			channelId: props.message().channelId as Id<"channels">,
			messageId: args.messageId as Id<"messages">,
			emoji: args.emoji,
			userId,
		})
	})

	async function createReaction(emoji: string) {
		if (!meQuery.data) return

		setOpenPopover(false)
		const alreadyReacted = props
			.message()
			.reactions.some((r) => r.userId === meQuery.data?._id && r.emoji === emoji)

		try {
			if (alreadyReacted) {
				return
			}

			await addReaction({
				serverId: state.serverId,
				messageId: props.message()._id,
				emoji,
			})
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error("Failed to toggle reaction", err)
		}
	}

	return (
		<Show when={reactionGroups().length > 0}>
			<div class="mt-1 flex items-center gap-2">
				<For each={reactionGroups()}>
					{(group) => {
						return (
							<button
								type="button"
								class="flex h-6 cursor-pointer items-center gap-1 rounded-full border border-primary bg-primary/30 px-2 hover:bg-primary/70"
								onClick={() => {
									const currentSelectedEmoji = currentSelectedEmojis().find(
										(reaction) => reaction.emoji === group.emoji,
									)

									if (currentSelectedEmoji) {
										removeReaction({
											id: props.message()._id,
											serverId: state.serverId,
											emoji: group.emoji,
										})
									} else {
										addReaction({
											messageId: props.message()._id,
											serverId: state.serverId,
											emoji: group.emoji,
										})
									}
								}}
							>
								{group.emoji} <span class="ml-1 text-xs">{group.reactions.length}</span>
							</button>
						)
					}}
				</For>
				<Popover open={openPopover()} onOpenChange={(value) => setOpenPopover(value.open)} lazyMount>
					<Popover.Trigger>
						<Button class="flex items-center justify-center" intent="ghost" size="icon">
							<IconEmojiAdd class="size-4!" />
						</Button>
					</Popover.Trigger>

					<Popover.UnstyledContent>
						<EmojiPicker onSelect={createReaction} />
					</Popover.UnstyledContent>
				</Popover>
			</div>
		</Show>
	)
}
