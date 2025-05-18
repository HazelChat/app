import { useParams } from "@tanstack/solid-router"
import {
	type Accessor,
	For,
	type JSX,
	Show,
	createEffect,
	createMemo,
	createSignal,
	onMount,
	splitProps,
} from "solid-js"
import { twJoin, twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"

import { IconCopy } from "~/components/icons/copy"
import { IconHorizontalDots } from "~/components/icons/horizontal-dots"
import { IconPin } from "~/components/icons/pin"
import { IconPlus } from "~/components/icons/plus"
import { IconReply } from "~/components/icons/reply"
import { IconTrash } from "~/components/icons/trash"

import { Avatar } from "~/components/ui/avatar"
import { Button, buttonVariants } from "~/components/ui/button"
import { Menu } from "~/components/ui/menu"
import { Popover } from "~/components/ui/popover"
import { Tooltip } from "~/components/ui/tooltip"
import type { Message } from "~/lib/hooks/data/use-chat-messages"
import { newId } from "~/lib/id-helpers"
import { useZero } from "~/lib/zero/zero-context"
import { chatStore$ } from "~/routes/_app/$serverId/chat/$id"

import { ConfirmDialog } from "./confirm-dialog"
import { ImageViewerModal } from "./image-viewer-modal"
import { ReactionTags } from "./reaction-tags"
import { UserTag } from "./user-tag"

import { Markdown } from "@maki-chat/markdown"
import { Badge } from "../ui/badge"
import { UserAvatar } from "../user-ui/user-popover-content"
import { ChatImage } from "./chat-image"

import { Text } from "@maki-chat/markdown/base-components"
import { IconThread } from "../icons/thread"

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

interface ChatMessageProps extends JSX.HTMLAttributes<HTMLDivElement> {
	serverId: Accessor<string>
	message: Accessor<Message>
	isGroupStart: Accessor<boolean>
	isGroupEnd: Accessor<boolean>
	isFirstNewMessage: Accessor<boolean>
	isThread: boolean
}

export function ChatMessage(props: ChatMessageProps) {
	const z = useZero()
	const params = useParams({ from: "/_app/$serverId/chat/$id" })()
	const showAvatar = createMemo(() => props.isGroupStart())
	const [chatStore, setChatStore] = chatStore$
	const [pendingAction, setPendingAction] = createSignal<ChatAction | null>(null)
	const isPinned = createMemo(() => props.message().pinnedInChannels?.some((p) => p.channelId === params.id))

	const [selectedImage, setSelectedImage] = createSignal<string | null>(null)

	const messageTime = createMemo(() => {
		return new Date(props.message().createdAt!).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
	})

	const attachedCount = createMemo(() => props.message().attachedFiles?.length ?? 0)

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
			key: "thread",
			label: "Thread",
			icon: <IconThread class="size-4" />,
			onAction: async () => {
				const threadChannelId = props.message().threadChannelId ?? newId("serverChannels")

				// This should only happen once a message is created in a thread. For now we will just create the channel immediately.
				if (!props.message().threadChannelId) {
					await z.mutateBatch(async (tx) => {
						await tx.serverChannels.insert({
							id: threadChannelId,
							serverId: props.serverId(),
							name: `Thread ${props.message().author?.displayName}`,
							channelType: "thread",
							parentChannelId: props.message().channelId,
							createdAt: Date.now(),
						})

						await tx.messages.update({
							id: props.message().id,
							threadChannelId,
						})
					})
				}

				setChatStore((prev) => ({ ...prev, openThreadId: threadChannelId }))
			},
			hotkey: "t",
			showButton: !props.isThread,
		},
		{
			key: "reply",
			label: "Reply",
			icon: <IconReply class="size-4" />,
			onAction: () => {
				setChatStore((prev) => ({ ...prev, replyToMessageId: props.message().id }))
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
			icon: <IconPin class="size-4" />,
			onAction: async () => {
				if (isPinned()) {
					await z.mutate.pinnedMessages.delete({
						id: props.message().pinnedInChannels?.find((p) => p.channelId === params.id)!.id,
					})
				} else {
					const id = newId("pinnedMessages")
					await z.mutate.pinnedMessages.insert({
						id,
						messageId: props.message().id,
						channelId: props.message().channelId!,
					})
				}
			},
			hotkey: "p",
			showMenu: true,
		},
		{
			key: "copy-text",
			label: "Copy Text",
			icon: <IconCopy class="size-4" />,
			onAction: () => navigator.clipboard.writeText(props.message().content),
			hotkey: "c",
			showMenu: true,
		},
		{
			key: "delete",
			label: "Delete",
			icon: <IconTrash class="size-4" />,
			onAction: async () => z.mutate.messages.delete({ id: props.message().id }),
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

	console.log(props.message().content)

	createEffect(() => {
		if (props.isFirstNewMessage()) {
			setTimeout(async () => {
				await z.mutate.channelMembers.update({
					channelId: props.message().channelId!,
					userId: z.userID,
					lastSeenMessageId: null,
					notificationCount: 0,
				})
			})
		}
	})

	return (
		<div
			id={`message-${props.message().id}`}
			class={chatMessageStyles({
				isGettingRepliedTo: false,
				isGroupStart: props.isGroupStart(),
				isGroupEnd: props.isGroupEnd(),
				isFirstNewMessage: props.isFirstNewMessage(),
				isPinned: isPinned(),
				class: "rounded-l-none",
			})}
			data-id={props.message().id}
			ref={props.ref}
		>
			<Show when={props.isFirstNewMessage()}>
				<div class="absolute top-1 right-1 z-10">
					<Badge class="text-[10px]">New Message</Badge>
				</div>
			</Show>
			<Show when={props.message().replyToMessageId}>
				<Button
					class="flex w-fit items-center gap-1 pl-12 text-left hover:bg-transparent"
					intent="ghost"
					onClick={() => {
						if (props.message().replyToMessageId) scrollToMessage(props.message().replyToMessageId!)
					}}
				>
					<Avatar
						class="size-4"
						name={props.message().replyToMessage?.author?.displayName!}
						src={props.message().replyToMessage?.author?.avatarUrl}
					/>
					<UserTag user={props.message().replyToMessage?.author!} />
					<span class="text-ellipsis text-foreground text-xs">
						{getPlainTextFromContent(props.message().replyToMessage?.content ?? "")}
					</span>
				</Button>
			</Show>
			<div class="flex gap-4">
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
											{a.hotkey && <span class="ml-2 text-muted-fg text-xs">[{a.hotkey}]</span>}
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
									// TODO: Show hotkey here
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
					<UserAvatar user={props.message().author!} serverId={props.serverId} />
				</Show>
				<Show when={!showAvatar()}>
					<div class="w-10 items-center justify-end pr-1 text-[10px] text-muted-foreground leading-tight opacity-0 group-hover:opacity-100">
						{messageTime()}
					</div>
				</Show>
				<div class="min-w-0 flex-1">
					<Show when={showAvatar()}>
						<div class="flex items-baseline gap-2">
							<span class="font-semibold">{props.message().author?.displayName}</span>
							<span class="text-muted-foreground text-xs">{messageTime()}</span>
						</div>
					</Show>
					<Markdown
						children={props.message().content}
						components={{
							a: (props) => (
								<a
									class={twJoin([
										"outline-0 outline-offset-2 transition-[color,_opacity] focus-visible:outline-2 focus-visible:outline-ring forced-colors:outline-[Highlight]",
										"disabled:cursor-default disabled:opacity-60 forced-colors:disabled:text-[GrayText]",
										"text-primary hover:underline",
									])}
									{...props}
									target="_blank"
									rel="noopener noreferrer"
								/>
							),
							text: Text,
							h1: (props) => <h1 class="font-bold text-xl" {...props} />,
							blockquote: (props) => (
								<blockquote
									class="rounded-[1px] border-primary border-l-4 bg-primary/10 py-0.5 pl-2 text-primary-fg italic"
									{...props}
								/>
							),
							pre: (props) => (
								<pre
									class={twJoin("bg-muted/50", "border", "font-mono", "rounded", "text-sm")}
									{...props}
								/>
							),
							img: (props) => {
								const [imgProps, rest] = splitProps(props, ["src", "alt", "onClick"])
								return (
									<div class={"relative aspect-video max-h-[300px] overflow-hidden rounded-md"}>
										<ChatImage
											src={imgProps.src!}
											alt={imgProps.alt!}
											onClick={() => {
												setSelectedImage(imgProps.src!)
											}}
											{...rest}
										/>
									</div>
								)
							},
						}}
						renderingStrategy="reconcile"
					/>
					<div class="flex flex-col gap-2">
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
								<For each={props.message().attachedFiles?.slice(0, 4)}>
									{(file) => (
										<div class={itemClass()}>
											<ChatImage
												src={`${import.meta.env.VITE_BUCKET_URL}/${file}`}
												alt={file}
												onClick={() => {
													setSelectedImage(file)
												}}
											/>
										</div>
									)}
								</For>
							</div>
						</Show>
						<ReactionTags message={props.message()} />
					</div>
					<Show when={props.message().threadChannel?.messages.length}>
						<ThreadButton message={props.message()} />
					</Show>
				</div>
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

			{/* TODO Move this out of the chat message  */}
			<ImageViewerModal
				selectedImage={selectedImage}
				setSelectedImage={setSelectedImage}
				author={props.message().author}
				createdAt={props.message().createdAt!}
				bucketUrl={import.meta.env.VITE_BUCKET_URL}
			/>
		</div>
	)
}

function ThreadButton(props: { message: Message }) {
	const threadMessages = createMemo(() => props.message.threadChannel?.messages ?? [])

	const topFourAuthors = createMemo(() => {
		const authors: { displayName: string; avatarUrl: string }[] = []
		for (const message of threadMessages()) {
			if (message.author?.avatarUrl && !authors.some((a) => a.avatarUrl === message.author!.avatarUrl)) {
				authors.push({ displayName: message.author.displayName!, avatarUrl: message.author.avatarUrl })
			}
		}
		return { authors: authors.slice(0, 4), total: authors.length }
	})

	const [chatStore, setChatStore] = chatStore$

	return (
		<Button
			intent="ghost"
			class="mt-1 flex w-full justify-start px-1"
			onClick={() => setChatStore((prev) => ({ ...prev, openThreadId: props.message.threadChannelId }))}
		>
			<For each={topFourAuthors().authors}>
				{(author) => <Avatar class="size-5" name={author.displayName!} src={author.avatarUrl} />}
			</For>
			<Show when={topFourAuthors().total > 4}>
				<span class="text-muted-foreground text-xs">+{topFourAuthors().total - 4}</span>
			</Show>
			<div class="ml-1 flex items-center gap-1">
				<p class="text-muted-foreground text-xs">{threadMessages().length} messages</p>
				{/* Dot separator */}
				<span class="mx-1 text-muted-foreground text-xs">&middot;</span>
				{/* TODO: Show the proper date here (or something like 23 minutes ago) */}
				<p class="text-muted-foreground text-xs">
					Last message{" "}
					{new Date(threadMessages()[0].createdAt!).toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
						hour12: false,
					})}
				</p>
			</div>
		</Button>
	)
}

export const chatMessageStyles = tv({
	base: "group relative flex flex-col px-4 py-1 transition-colors hover:bg-muted/50",
	variants: {
		variant: {
			chat: "rounded-l-none rounded-md",
			pinned: "border p-3 rounded-md",
		},
		isFirstNewMessage: {
			true: "border-emerald-500 border-l-2 bg-emerald-500/20 hover:bg-emerald-500/15",
			false: "",
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
		isPinned: false,
		isGettingRepliedTo: false,
		isGroupStart: false,
		isGroupEnd: false,
	},
})

function IconBrandLinear(props: { class?: string }) {
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
				fill="currentColor"
			/>
			<path
				d="M3 11.4938L12.4921 20.9858C13.2976 20.9407 14.0981 20.7879 14.8704 20.5273L3.4585 9.11548C3.19793 9.88771 3.0451 10.6883 3 11.4938Z"
				fill="currentColor"
			/>
			<path
				d="M3.86722 8.10999L15.8758 20.1186C16.4988 19.8201 17.0946 19.4458 17.6493 18.9956L4.99021 6.33659C4.54006 6.89125 4.16573 7.487 3.86722 8.10999Z"
				fill="currentColor"
			/>
			<path
				d="M5.66301 5.59517C9.18091 2.12137 14.8488 2.135 18.3498 5.63604C21.8508 9.13708 21.8645 14.8049 18.3907 18.3228L5.66301 5.59517Z"
				fill="currentColor"
			/>
		</svg>
	)
}
