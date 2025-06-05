import { type Accessor, For, Show, createMemo, createSignal } from "solid-js"
import { twMerge } from "tailwind-merge"

import { IconHorizontalDots } from "~/components/icons/horizontal-dots"
import { Button, buttonVariants } from "~/components/ui/button"
import { Menu } from "~/components/ui/menu"
import { Popover } from "~/components/ui/popover"
import { Tooltip } from "~/components/ui/tooltip"

import type { Doc } from "@hazel/backend"
import { ConfirmDialog } from "../confirm-dialog"
import { createMessageActions } from "./message-actions-config"
import type { Message } from "~/lib/types"

interface MessageActionsProps {
	message: Accessor<Message>
	serverId: Accessor<string>
	isPinned: Accessor<boolean>
	isThread: boolean
}

export function MessageActions(props: MessageActionsProps) {
	const [open, setOpen] = createSignal(false)
	const [pendingAction, setPendingAction] = createSignal<any>(null)

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

	return (
		<>
			<div
				class={twMerge(
					"-top-4 absolute right-4 z-20 rounded-md border bg-sidebar shadow-md group-hover:flex",
					open() ? "flex" : "hidden",
				)}
			>
				<For each={actions().filter((a) => a.showButton)}>
					{(a) => (
						<Show
							when={a.popoverContent}
							fallback={
								<Tooltip lazyMount>
									<Tooltip.Trigger>
										<Button intent="ghost" size="square" onClick={() => handleAction(a)}>
											{a.icon}
										</Button>
										<Tooltip.Content>
											{a.label}
											{a.hotkey && (
												<span class="ml-2 text-muted-fg text-xs">[{a.hotkey}]</span>
											)}
										</Tooltip.Content>
									</Tooltip.Trigger>
								</Tooltip>
							}
						>
							<Popover lazyMount>
								<Tooltip>
									<Tooltip.Trigger>
										<Button intent="ghost" size="square">
											{a.icon}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content>
										{a.label}
										{a.hotkey && (
											<span class="ml-2 text-muted-fg text-xs">[{a.hotkey}]</span>
										)}
									</Tooltip.Content>
									<Popover.Content>{a.popoverContent}</Popover.Content>
								</Tooltip>
							</Popover>
						</Show>
					)}
				</For>

				<Menu open={open()} onOpenChange={() => setOpen((prev) => !prev)} lazyMount>
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
