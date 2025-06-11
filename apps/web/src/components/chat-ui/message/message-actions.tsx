import { type Accessor, For, createSignal } from "solid-js"
import { twMerge } from "tailwind-merge"

import { IconHorizontalDots } from "~/components/icons/horizontal-dots"
import { Button, buttonVariants } from "~/components/ui/button"
import { Menu } from "~/components/ui/menu"
import { Popover } from "~/components/ui/popover"
import { Tooltip } from "~/components/ui/tooltip"

import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { useChat } from "~/components/chat-state/chat-store"
import { IconPlus } from "~/components/icons/plus"
import { createMutation } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import type { Message } from "~/lib/types"
import { ConfirmDialog } from "../confirm-dialog"
import { EmojiPicker } from "./emoji-picker"
import { createMessageActions } from "./message-actions-config"

interface MessageActionsProps {
	message: Accessor<Message>
	serverId: Accessor<string>
	isPinned: Accessor<boolean>
	isGroupStart: Accessor<boolean>
	isThread: boolean
}

export function MessageActions(props: MessageActionsProps) {
	const [open, setOpen] = createSignal(false)
	const [openPopover, setOpenPopover] = createSignal(false)
	const [pendingAction, setPendingAction] = createSignal<any>(null)

	const { state } = useChat()

	const meQuery = useQuery(() => convexQuery(api.me.getUser, { serverId: state.serverId }))

	const actions = createMessageActions({
		message: props.message,
		isPinned: props.isPinned,
		isThread: props.isThread,
	})

	const handleAction = (action: any) => {
		if (action.confirm) {
			setPendingAction(action)
		} else {
			action.onAction()
		}
	}

	const createReactionMutation = createMutation(api.messages.createReaction)
	const deleteReactionMutation = createMutation(api.messages.deleteReaction)

	async function toggleReaction(emoji: string) {
		if (!meQuery.data) return

		setOpenPopover(false)
		const alreadyReacted = props
			.message()
			.reactions.some((r) => r.userId === meQuery.data?._id && r.emoji === emoji)

		try {
			if (alreadyReacted) {
				await deleteReactionMutation({
					serverId: state.serverId,
					id: props.message()._id,
					emoji,
				})
			} else {
				await createReactionMutation({
					serverId: state.serverId,
					messageId: props.message()._id,
					userId: meQuery.data._id,
					emoji,
				})
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.error("Failed to toggle reaction", err)
		}
	}

	return (
		<>
			<div
				class={twMerge(
					"-top-4 absolute right-4 z-20 rounded-md border bg-sidebar shadow-md group-hover:flex",
					props.isGroupStart() ? "-top-4" : "-top-6",
					open() || openPopover() ? "flex" : "hidden",
				)}
			>
				<Popover open={openPopover()} onOpenChange={(value) => setOpenPopover(value.open)} lazyMount>
					<Popover.Trigger>
						<Button intent="ghost" size="square">
							<IconPlus />
						</Button>
					</Popover.Trigger>

					<Popover.UnstyledContent>
						<EmojiPicker onSelect={toggleReaction} />
					</Popover.UnstyledContent>
				</Popover>
				<For each={actions().filter((a) => a.showButton)}>
					{(a) => (
						<Tooltip lazyMount>
							<Tooltip.Trigger>
								<Button intent="ghost" size="square" onClick={() => handleAction(a)}>
									{a.icon}
								</Button>
								<Tooltip.Content>
									{a.label}
									{a.hotkey && <span class="ml-2 text-muted-fg text-xs">[{a.hotkey}]</span>}
								</Tooltip.Content>
							</Tooltip.Trigger>
						</Tooltip>
					)}
				</For>

				<Menu open={open()} onOpenChange={(value) => setOpen(value.open)} lazyMount>
					<Menu.Trigger class={twMerge(buttonVariants({ intent: "ghost", size: "square" }))}>
						<IconHorizontalDots class="size-4" />
					</Menu.Trigger>
					<Menu.Content class="z-20">
						<For each={actions().filter((a) => a.showMenu)}>
							{(a) => (
								<Menu.Item
									value={a.label}
									class={`flex justify-between ${a.isDanger ? "text-danger" : ""}`}
									onClick={() => handleAction(a)}
								>
									<span>{a.label}</span>
									{a.icon}
								</Menu.Item>
							)}
						</For>
					</Menu.Content>
				</Menu>
			</div>

			<ConfirmDialog
				lazyMount
				open={!!pendingAction()}
				title={pendingAction()?.label}
				message={pendingAction()?.confirmMessage || "Are you sure?"}
				onCancel={() => setPendingAction(null)}
				onConfirm={async () => {
					await pendingAction()?.onAction()
					setPendingAction(null)
				}}
			/>
		</>
	)
}
