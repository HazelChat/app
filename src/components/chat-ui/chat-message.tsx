import { For, Show, createMemo, createSignal, type Accessor, type JSX, type Signal } from "solid-js"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"
import type { Message } from "~/lib/hooks/data/use-chat-messages"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button, buttonVariants } from "../ui/button"
import { ChatImage } from "./chat-image"
import { ReactionTags } from "./reaction-tags"
import { UserTag } from "./user-tag"
import { Tooltip } from "../ui/tooltip"
import { IconPlus } from "./floating-bar"
import { chatStore$ } from "~/routes/_app/$serverId/chat/$id"
import { useZero } from "~/lib/zero-context"
import { newId } from "~/lib/id-helpers"
import { Popover } from "../ui/popover"
import { Menu } from "../ui/menu"
import { ConfirmDialog } from "./confirm-dialog"
import { useParams } from "@tanstack/solid-router"

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

type ChatAction = {
	key: string
	label: string
	icon: JSX.Element
	onAction: () => void | Promise<void>
	hotkey?: string
	showButton?: boolean
	showMenu?: boolean
	isDanger?: boolean
	confirm?: boolean
	confirmMessage?: string
	popoverContent?: JSX.Element
}

export function ChatMessage(props: {
	message: Message
	isGroupStart: boolean
	isGroupEnd: boolean
}) {
	const z = useZero()
	const params = useParams({ from: "/_app/$serverId/chat/$id" })()
	const showAvatar = createMemo(() => props.isGroupStart)
	const [chatStore, setChatStore] = chatStore$
	const [pendingAction, setPendingAction] = createSignal<ChatAction | null>(null)
	const isPinned = createMemo(() => props.message.pinnedInChannels?.some((p) => p.channelId === params.id))

	const messageTime = createMemo(() => {
		return new Date(props.message.createdAt!).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
	})

	const attachedCount = createMemo(() => props.message.attachedFiles?.length ?? 0)

	const itemClass = createMemo(() =>
		twMerge(
			"relative overflow-hidden rounded-md",
			attachedCount() === 1 ? "max-h-[300px]" : attachedCount() === 2 ? "aspect-video" : "aspect-square",
		),
	)

	const scrollToMessage = (id: string) => {
		const el = document.getElementById(`message-${id}`)
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" })
			el.classList.add("bg-primary/20")
			setTimeout(() => el.classList.remove("bg-primary/20"), 1500)
		}
	}

	const actions = createMemo<ChatAction[]>(() => [
		{
			key: "add-reaction",
			label: "Add Reaction",
			icon: <IconPlus />,
			onAction: () => {},
			hotkey: "r",
			showButton: true,
			popoverContent: (
				<div class="py-3">
					{/* <EmojiPicker.Root
						onEmojiSelect={async (emoji) => {
							const reactId = newId("reactions")

							const prevEmojiSelection = await z.query.reactions
								.where("emoji", "=", emoji.emoji)
								.where("userId", "=", z.userID)
								.one()
								.run()

							if (prevEmojiSelection) {
								return
							}

							await z.mutate.reactions.insert({
								messageId: message.id,
								userId: z.userID,
								emoji: emoji.emoji,
								id: reactId,
							})
						}}
						class="isolate flex h-[368px] w-fit flex-col"
					>
						<EmojiPicker.Search class="z-10 mx-2 mt-2 appearance-none rounded-md bg-muted px-2.5 py-2 text-sm outline-0" />
						<EmojiPicker.Viewport class="relative flex-1 outline-hidden">
							<EmojiPicker.Loading class="absolute inset-0 flex items-center justify-center text-muted-fg text-sm">
								Loading…
							</EmojiPicker.Loading>
							<EmojiPicker.Empty class="absolute inset-0 flex items-center justify-center text-muted-fg text-sm">
								No emoji found.
							</EmojiPicker.Empty>
							<EmojiPicker.List
								class="select-none pb-1.5"
								components={{
									CategoryHeader: ({ category, ...props }) => (
										<div
											class="bg-overlay px-3 pt-3 pb-1.5 font-medium text-muted-fg text-xs"
											{...props}
										>
											{category.label}
										</div>
									),
									Row: ({ children, ...props }) => (
										<div class="scroll-my-1.5 px-1.5" {...props}>
											{children}
										</div>
									),
									Emoji: ({ emoji, ...props }) => {
										return (
											<button
												class="before:-z-1 relative flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md text-lg before:absolute before:inset-0 before:hidden before:items-center before:justify-center before:text-[2.5em] before:blur-lg before:saturate-200 before:content-(--emoji) data-[active]:bg-fg/10 data-[active]:before:flex"
												style={
													{
														"--emoji": `"${emoji.emoji}"`,
													} as CSSProperties
												}
												{...props}
											>
												{emoji.emoji}
											</button>
										)
									},
								}}
							/>
						</EmojiPicker.Viewport>
						<div class="-mx-4 z-10 hidden h-8 w-full min-w-0 max-w-(--frimousse-viewport-width) flex-none items-center gap-1 px-4 shadow-[0_-1px_--alpha(var(--color-muted)/65%)] sm:flex dark:shadow-[0_-1px_var(--color-muted)]">
							<EmojiPicker.ActiveEmoji>
								{({ emoji }) =>
									emoji ? (
										<>
											<div class="flex size-8 flex-none items-center justify-center text-xl">
												{emoji.emoji}
											</div>
											<span class="truncate font-medium text-muted-fg text-xs">
												{emoji.label}
											</span>
										</>
									) : (
										<span class="ml-2 truncate font-medium text-muted-fg text-xs">
											Select an emoji…
										</span>
									)
								}
							</EmojiPicker.ActiveEmoji>
						</div>
					</EmojiPicker.Root> */}
				</div>
			),
		},
		{
			key: "reply",
			label: "Reply",
			icon: <IconReply class="size-4" />,
			onAction: () => {
				setChatStore((prev) => ({ ...prev, replyToMessageId: props.message.id }))
			},
			hotkey: "shift+r",
			showButton: true,
		},
		{
			key: "create-issue",
			label: "Create Issue",
			icon: <IconBrandLinear class="size-4" />,
			onAction: () => {},
			hotkey: "i",
			showMenu: true,
		},
		{
			key: "pin",
			label: isPinned() ? "Unpin" : "Pin",
			icon: isPinned() ? <IconPin2 class="size-4" /> : <IconPin2 class="size-4" />,
			onAction: async () => {
				if (isPinned()) {
					await z.mutate.pinnedMessages.delete({
						id: props.message.pinnedInChannels?.find((p) => p.channelId === params.id)!.id,
					})
				} else {
					const id = newId("pinnedMessages")
					await z.mutate.pinnedMessages.insert({
						id,
						messageId: props.message.id,
						channelId: props.message.channelId!,
					})
				}
			},
			hotkey: "p",
			showMenu: true,
		},
		{
			key: "copy-text",
			label: "Copy Text",
			icon: <IconPaper class="size-4" />,
			onAction: () => navigator.clipboard.writeText(props.message.content),
			hotkey: "c",
			showMenu: true,
		},
		{
			key: "delete",
			label: "Delete",
			icon: <IconTrash class="size-4" />,
			onAction: async () => z.mutate.messages.delete({ id: props.message.id }),
			hotkey: "del",
			showMenu: true,
			isDanger: true,
			confirm: true,
			confirmMessage: "Are you sure you want to delete this message?",
		},
	])

	const handleAction = (action: ChatAction) => {
		if (action.confirm) {
			setPendingAction(action)
		} else {
			action.onAction()
		}
	}

	const [open, setOpen] = createSignal(false)

	return (
		<div
			id={`message-${props.message.id}`}
			class={chatMessageStyles({
				isGettingRepliedTo: false,
				isGroupStart: props.isGroupStart,
				isGroupEnd: props.isGroupEnd,
				isPinned: isPinned(),
			})}
		>
			<Show when={props.message.replyToMessageId}>
				<Button
					class="flex w-fit items-center gap-1 pl-12 text-left"
					intent="ghost"
					onClick={() => {
						if (props.message.replyToMessageId) scrollToMessage(props.message.replyToMessageId)
					}}
				>
					<Avatar class="size-4">
						<AvatarImage src={props.message.replyToMessage?.author?.avatarUrl} />
						<AvatarFallback>{props.message.replyToMessage?.author?.displayName.slice(0, 2)}</AvatarFallback>
					</Avatar>
					<UserTag user={props.message.replyToMessage?.author!} />
					<span class="text-ellipsis text-foreground text-xs">
						{getPlainTextFromContent(props.message.replyToMessage?.content ?? "")}
					</span>
				</Button>
			</Show>
			<div class="flex gap-4">
				<div
					class={twMerge(
						"-top-4 absolute right-4 rounded-md border bg-sidebar shadow-md group-hover:flex",
						open() ? "flex" : "hidden",
					)}
				>
					<For each={actions().filter((a) => a.showButton)}>
						{(a) => (
							<Show
								when={a.popoverContent}
								fallback={
									<Tooltip>
										<Button intent="ghost" size="icon" onClick={() => handleAction(a)}>
											{a.icon}
										</Button>
										<Tooltip.Content>
											{a.label}
											{a.hotkey && <span class="ml-2 text-muted-fg text-xs">[{a.hotkey}]</span>}
										</Tooltip.Content>
									</Tooltip>
								}
							>
								<Tooltip>
									<Popover>
										<Button intent="ghost" size="icon">
											{a.icon}
										</Button>
										<Tooltip.Content>
											{a.label}
											{a.hotkey && <span class="ml-2 text-muted-fg text-xs">[{a.hotkey}]</span>}
										</Tooltip.Content>
										<Popover.Content>{a.popoverContent}</Popover.Content>
									</Popover>
								</Tooltip>
							</Show>
						)}
					</For>
					<Menu open={open()} onOpenChange={() => setOpen((prev) => !prev)}>
						<Menu.Trigger class={twMerge(buttonVariants({ intent: "ghost", size: "icon" }))}>
							<IconDotsHorizontal class="size-4" />
						</Menu.Trigger>
						<Menu.Content>
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
				<Show when={showAvatar()}>
					<Avatar>
						<AvatarImage src={props.message.author?.avatarUrl} />
						<AvatarFallback>{props.message.author?.displayName.slice(0, 2)}</AvatarFallback>
					</Avatar>
				</Show>
				<Show when={!showAvatar()}>
					<div class="w-10 items-center justify-end pr-1 text-[10px] text-muted-foreground leading-tight opacity-0 group-hover:opacity-100">
						{messageTime()}
					</div>
				</Show>
				<div class="min-w-0 flex-1">
					<Show when={showAvatar()}>
						<div class="flex items-baseline gap-2">
							<span class="font-semibold">{props.message.author?.displayName}</span>
							<span class="text-muted-foreground text-xs">{messageTime()}</span>
						</div>
					</Show>
					{/* TODO: This should be a markdown viewer */}
					<p class="text-sm">{props.message.content}</p>
					<div class="flex flex-col gap-2 pt-2">
						<Show when={attachedCount() > 0}>
							<div
								class={twMerge(
									"mt-2",
									attachedCount() === 1
										? "flex max-w-[400px]"
										: `grid grid-cols-${attachedCount() === 3 ? 3 : 2} max-w-lg`,
									"gap-1",
								)}
							>
								<For each={props.message.attachedFiles?.slice(0, 4)}>
									{(file) => (
										<div class={itemClass()}>
											<ChatImage src={`${import.meta.env.VITE_BUCKET_URL}/${file}`} alt={file} />
										</div>
									)}
								</For>
							</div>
						</Show>
						<ReactionTags message={props.message} />
					</div>
				</div>
			</div>
			<ConfirmDialog
				open={!!pendingAction()}
				title={pendingAction()?.label}
				message={pendingAction()?.confirmMessage || "Are you sure?"}
				onCancel={() => setPendingAction(null)}
				onConfirm={async () => {
					await pendingAction()?.onAction()
					setPendingAction(null)
				}}
			/>
		</div>
	)
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
		isPinned: {
			true: "border-primary border-l-2 bg-primary/20 hover:bg-primary/15",
			false: "",
		},
	},
	defaultVariants: {
		variant: "chat",
	},
})

function IconReply(props: { class: string }) {
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
			class={props.class}
		>
			<polyline points="9 17 4 12 9 7" />
			<path d="M20 18v-2a4 4 0 0 0-4-4H4" />
		</svg>
	)
}

function IconBrandLinear(props: { class: string }) {
	return (
		<svg
			width="800px"
			height="800px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			class={props.class}
		>
			<path
				d="M3.03509 12.9431C3.24245 14.9227 4.10472 16.8468 5.62188 18.364C7.13904 19.8811 9.0631 20.7434 11.0428 20.9508L3.03509 12.9431Z"
				fill="#000000"
			/>
			<path
				d="M3 11.4938L12.4921 20.9858C13.2976 20.9407 14.0981 20.7879 14.8704 20.5273L3.4585 9.11548C3.19793 9.88771 3.0451 10.6883 3 11.4938Z"
				fill="#000000"
			/>
			<path
				d="M3.86722 8.10999L15.8758 20.1186C16.4988 19.8201 17.0946 19.4458 17.6493 18.9956L4.99021 6.33659C4.54006 6.89125 4.16573 7.487 3.86722 8.10999Z"
				fill="#000000"
			/>
			<path
				d="M5.66301 5.59517C9.18091 2.12137 14.8488 2.135 18.3498 5.63604C21.8508 9.13708 21.8645 14.8049 18.3907 18.3228L5.66301 5.59517Z"
				fill="#000000"
			/>
		</svg>
	)
}

export function IconPin2(props: { class: string }) {
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
			class={props.class}
		>
			<path d="M12 17v5" />
			<path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
		</svg>
	)
}

export function IconPaper(props: { class: string }) {
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
			class={props.class}
		>
			<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	)
}

export function IconTrash(props: { class: string }) {
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
			class={props.class}
		>
			<path d="M3 6h18" />
			<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
			<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
		</svg>
	)
}

function IconDotsHorizontal(props: { class: string }) {
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
			class={props.class}
		>
			<circle cx="12" cy="12" r="1" />
			<circle cx="12" cy="19" r="1" />
			<circle cx="12" cy="5" r="1" />
		</svg>
	)
}
