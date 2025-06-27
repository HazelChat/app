import { Markdown } from "@maki-chat/markdown"
import {
	type Accessor,
	createMemo,
	createSignal,
	ErrorBoundary,
	For,
	Show,
	Suspense,
	splitProps,
} from "solid-js"
import { reconcile } from "solid-js/store"
import { twJoin } from "tailwind-merge"
import { useChat } from "~/components/chat-state/chat-store"
import { IconCheckTickSingleStroke, IconCopyStroke } from "~/components/iconsv2"
import type { Message } from "~/lib/types"
import { cn } from "~/lib/utils"
import { ChatImage } from "./chat-image"
import { ReactionTags } from "./reaction-tags"
import { ThreadButton } from "./thread-button"

interface MessageContentProps {
	message: Accessor<Message>
	serverId: Accessor<string>
	showAvatar: Accessor<boolean>
}

export function MessageContent(props: MessageContentProps) {
	const { setState } = useChat()

	const attachedCount = createMemo(() => props.message().attachedFiles?.length ?? 0)

	const messageTime = createMemo(() => {
		return new Date(props.message()._creationTime).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
	})

	return (
		<div class="min-w-0 flex-1">
			<Show when={props.showAvatar()}>
				<div class="flex items-baseline gap-2">
					<span class="font-semibold">{props.message().author?.displayName}</span>
					<span class="text-muted-foreground text-xs">{messageTime()}</span>
				</div>
			</Show>
			<ErrorBoundary fallback={<p>{props.message().content}</p>}>
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
						p: (props) => <p class="" {...props} />,
						h1: (props) => <h1 class="font-bold text-xl" {...props} />,
						blockquote: (props) => (
							<blockquote
								class="rounded-[1px] border-primary border-l-4 bg-primary/10 py-0.5 pl-2 text-primary-fg italic"
								{...props}
							/>
						),
						pre: (props) => {
							const [preProps, rest] = splitProps(props, ["class", "children"])
							const [isCopied, setIsCopied] = createSignal(false)
							let preRef: HTMLPreElement | undefined

							const handleCopy = async () => {
								if (preRef?.textContent) {
									try {
										await navigator.clipboard.writeText(preRef.textContent)
										setIsCopied(true)
										setTimeout(() => setIsCopied(false), 2000)
									} catch (err) {
										console.error("Failed to copy text: ", err)
									}
								}
							}

							return (
								<div class="group relative flex max-w-2xl items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 font-mono">
									<pre
										ref={preRef}
										class={twJoin(
											"flex-grow",
											"text-sm",
											"overflow-x-auto",
											"font-code",
											preProps.class,
										)}
										{...rest}
									>
										{preProps.children}
									</pre>
									<div class="flex self-start">
										<button
											type="button"
											onClick={handleCopy}
											aria-label="Copy code"
											class={twJoin(
												"rounded-md p-1.5",
												"text-muted-foreground/80",
												"opacity-0 focus:opacity-100 group-hover:opacity-100",
												"transition-all duration-200",
												"hover:bg-muted hover:text-muted-foreground",
												isCopied() &&
													"!opacity-100 bg-emerald-500/20 text-emerald-500",
											)}
										>
											<Show
												when={isCopied()}
												fallback={<IconCopyStroke class="size-4" />}
											>
												<IconCheckTickSingleStroke class="size-4" />
											</Show>
										</button>
									</div>
								</div>
							)
						},
						li: (props) => <li class="" {...props} />,
						ul: (props) => {
							return (
								<ul
									class="list-inside list-disc"
									style={{ "padding-left": `${props.depth * 4}px` }}
									{...props}
								/>
							)
						},
						code: (props) => {
							return (
								<code
									class="rounded-md border bg-muted/50 p-1 font-code text-sm"
									{...props}
								/>
							)
						},
						img: (parentProps) => {
							const [imgProps, rest] = splitProps(parentProps, ["src", "alt", "onClick"])
							return (
								<div class={"relative aspect-video max-h-[300px] overflow-hidden rounded-md"}>
									<ChatImage
										src={imgProps.src!}
										alt={imgProps.alt!}
										onClick={() => {
											setState(
												"imageDialog",
												reconcile({
													open: true,
													messageId: props.message()._id,
													selectedImage: imgProps.src!,
												}),
											)
										}}
										{...rest}
									/>
								</div>
							)
						},
					}}
					renderingStrategy="memo"
				/>
			</ErrorBoundary>

			<div class="flex flex-col gap-2">
				<Show when={attachedCount() > 0}>
					<div
						class={cn("mt-2 grid max-w-lg grid-cols-2 gap-1", {
							"grid-cols-3": attachedCount() === 3,
						})}
					>
						<For each={props.message().attachedFiles?.slice(0, 4)}>
							{(file, index) => (
								<div
									class={cn([
										"relative aspect-square cursor-pointer overflow-hidden rounded",
										"transition-opacity hover:opacity-90",
										{
											"col-span-2 aspect-auto max-w-[400px]": attachedCount() === 1,
											"col-span-2 row-span-2": attachedCount() === 3 && index() === 0,
										},
									])}
								>
									<ChatImage
										src={`${import.meta.env.VITE_BUCKET_URL}/${file}`}
										alt={file}
										class={cn([
											"h-full w-full object-cover",
											{
												"h-auto max-h-[300px] w-auto": attachedCount() === 1,
											},
										])}
										onClick={() => {
											setState(
												"imageDialog",
												reconcile({
													open: true,
													messageId: props.message()._id,
													selectedImage: file,
												}),
											)
										}}
									/>
									{attachedCount() > 4 && index() === 3 && (
										<div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
											<span class="font-semibold text-lg text-white">
												+{attachedCount() - 4}
											</span>
										</div>
									)}
								</div>
							)}
						</For>
					</div>
				</Show>
				<Suspense>
					<ReactionTags message={props.message} />
				</Suspense>
			</div>

			<Show when={props.message().threadChannelId && props.message().threadMessages?.length > 0}>
				<ThreadButton
					threadChannelId={props.message().threadChannelId!}
					threadMessages={props.message().threadMessages}
				/>
			</Show>
		</div>
	)
}
