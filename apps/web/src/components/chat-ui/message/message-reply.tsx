import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { Markdown } from "@maki-chat/markdown"
import { useQuery } from "@tanstack/solid-query"
import { type Accessor, Show, Suspense, createMemo } from "solid-js"
import { twJoin } from "tailwind-merge"
import { useChat } from "~/components/chat-state/chat-store"
import { IconCode } from "~/components/icons/code"
import { IconImage } from "~/components/icons/image"
import { IconQuote } from "~/components/icons/quote"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { convexQuery } from "~/lib/convex-query"
import { UserTag } from "../user-tag"

interface MessageReplyProps {
	message: Accessor<Doc<"messages">>
	onReplyClick: (id: Id<"messages">) => void
}

export function MessageReply(props: MessageReplyProps) {
	const { state } = useChat()

	const replyToMessageId = createMemo(() => props.message().replyToMessageId)

	const replyToMessageQuery = useQuery(() => ({
		...convexQuery(
			api.messages.getMessage,
			!replyToMessageId()
				? "skip"
				: {
						id: replyToMessageId()!,
						channelId: state.channelId,
						serverId: state.serverId,
					},
		),
		enabled: !!replyToMessageId(),
	}))

	return (
		<Suspense
			fallback={
				<div>
					<svg
						class="absolute top-2 left-8 rotate-180 text-muted"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
					>
						<path
							d="M12 2 L12 8 Q12 12 8 12 L2 12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							fill="none"
						/>
					</svg>

					<Button
						class="flex w-fit items-center gap-1 pl-12 text-left hover:bg-transparent"
						intent="ghost"
					>
						<div class="size-4 animate-pulse rounded-full bg-muted" />

						<span class={"text-muted-foreground text-sm hover:underline"}>@Loading...</span>
						<span class="text-ellipsis text-foreground text-xs">
							<Markdown
								children={"Loading..."}
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
									p: (props) => <span class="">{props.children}</span>,
									h1: (props) => <span class="font-bold">{props.children}</span>,
									blockquote: (props) => (
										<IconQuote class="inline-flex text-muted-foreground" />
									),
									pre: (props) => <IconCode class="inline-flex text-muted-foreground" />,
									img: (parentProps) => {
										return <IconImage class="inline-flex text-muted-foreground" />
									},
								}}
								renderingStrategy="memo"
							/>
						</span>
					</Button>
				</div>
			}
		>
			<Show when={replyToMessageQuery.data} keyed>
				{(replyToMessage) => (
					<div>
						<svg
							class="absolute top-2 left-8 rotate-180 text-muted"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
						>
							<path
								d="M12 2 L12 8 Q12 12 8 12 L2 12"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								fill="none"
							/>
						</svg>

						<Button
							class="flex w-fit items-center gap-1 pl-12 text-left hover:bg-transparent"
							intent="ghost"
							onClick={() => {
								const replyToMessageId = props.message().replyToMessageId
								if (replyToMessageId) {
									props.onReplyClick(replyToMessageId)
								}
							}}
						>
							<Avatar
								class="size-4"
								name={replyToMessage.author.displayName!}
								src={replyToMessage.author.avatarUrl}
							/>
							<UserTag user={replyToMessage.author} />
							<span class="text-ellipsis text-foreground text-xs">
								<Markdown
									children={replyToMessage?.content.split("\n")[0]}
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
										p: (props) => <span class="">{props.children}</span>,
										h1: (props) => <span class="font-bold">{props.children}</span>,
										blockquote: (props) => (
											<IconQuote class="inline-flex text-muted-foreground" />
										),
										pre: (props) => (
											<IconCode class="inline-flex text-muted-foreground" />
										),
										img: (parentProps) => {
											return <IconImage class="inline-flex text-muted-foreground" />
										},
									}}
									renderingStrategy="memo"
								/>
							</span>
						</Button>
					</div>
				)}
			</Show>
		</Suspense>
	)
}
