import type { Message } from "@hazel/db/models"
import type { ChannelId, MessageId } from "@hazel/db/schema"
import { count, eq, useLiveQuery } from "@tanstack/react-db"
import { format } from "date-fns"
import { Button } from "react-aria-components"
import { messageCollection, userCollection } from "~/db/collections"
import { useChat } from "~/hooks/use-chat"
import { cx } from "~/utils/cx"
import { Avatar } from "../base/avatar/avatar"
import IconThread from "../icons/icon-thread"

interface InlineThreadPreviewProps {
	threadChannelId: ChannelId
	messageId: MessageId
	maxPreviewMessages?: number
}

export function InlineThreadPreview({
	threadChannelId,
	messageId,
	maxPreviewMessages = 3,
}: InlineThreadPreviewProps) {
	const { openThread } = useChat()

	// Fetch thread messages
	const { data: threadMessages } = useLiveQuery(
		(q) =>
			q
				.from({ message: messageCollection })
				.where(({ message }) => eq(message.channelId, threadChannelId))
				.orderBy(({ message }) => message.createdAt, "asc")
				.limit(maxPreviewMessages + 1), // Fetch one extra to check if there are more
		[threadChannelId, maxPreviewMessages],
	)

	// Get total thread message count
	const { data: countData } = useLiveQuery(
		(q) =>
			q
				.from({ message: messageCollection })
				.where(({ message }) => eq(message.channelId, threadChannelId))
				.select(({ message }) => ({
					count: count(message.id),
				})),
		[threadChannelId],
	)

	const totalCount = countData?.[0]?.count ?? 0
	const previewMessages = threadMessages?.slice(0, maxPreviewMessages) ?? []
	const hasMoreMessages = totalCount > maxPreviewMessages

	if (!previewMessages || previewMessages.length === 0) {
		return null
	}

	return (
		<div className="mt-2">
			{/* Thread container with visual connection */}
			<div className="relative">
				{/* Vertical line connecting to parent message */}
				<div className="absolute top-0 bottom-0 left-4 w-0.5 bg-quaternary/50" />

				{/* Thread messages */}
				<div className="space-y-1 pl-8">
					{previewMessages.map((message) => (
						<ThreadMessagePreview key={message.id} message={message} />
					))}
				</div>
			</div>

			{/* View full thread button */}
			<button
				type="button"
				onClick={() => openThread(threadChannelId, messageId)}
				className="mt-2 ml-8 flex items-center gap-2 text-brand text-sm transition-colors hover:text-brand-hover"
			>
				<IconThread className="size-4" />
				<span className="font-medium">
					{hasMoreMessages
						? `View all ${totalCount} ${totalCount === 1 ? "reply" : "replies"}`
						: `${totalCount} ${totalCount === 1 ? "reply" : "replies"}`}
				</span>
			</button>
		</div>
	)
}

function ThreadMessagePreview({ message }: { message: typeof Message.Model.Type }) {
	// Fetch user data for the message author
	const { data: userData } = useLiveQuery(
		(q) =>
			q
				.from({ user: userCollection })
				.where(({ user }) => eq(user.id, message.authorId))
				.limit(1),
		[message.authorId],
	)

	const user = userData?.[0]

	if (!user) return null

	return (
		<div className="group flex gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
			<Avatar size="xs" alt={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} />

			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="font-medium text-sm">
						{user.firstName} {user.lastName}
					</span>
					<span className="text-secondary text-xs">{format(message.createdAt, "HH:mm")}</span>
				</div>
				<p className="text-foreground text-sm leading-snug">{message.content}</p>
			</div>
		</div>
	)
}
