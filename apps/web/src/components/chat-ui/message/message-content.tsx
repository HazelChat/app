import { type Accessor, For, Show, createMemo, splitProps } from "solid-js"
import { reconcile } from "solid-js/store"
import { twJoin } from "tailwind-merge"

import { cn } from "~/lib/utils"
import { ChatImage } from "./chat-image"
import { ThreadButton } from "./thread-button"

import { Markdown } from "@maki-chat/markdown"
import { useChat } from "~/components/chat-state/chat-store"
import type { Message } from "~/lib/types"
import { ReactionTags } from "./reaction-tags"

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
					pre: (props) => (
						<pre
							class={twJoin("bg-muted/50", "border", "font-mono", "rounded", "text-sm")}
							{...props}
						/>
					),
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
										src={file.url}
										alt={file.fileName}
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
													selectedImage: file.url,
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
				<ReactionTags message={props.message} />
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
