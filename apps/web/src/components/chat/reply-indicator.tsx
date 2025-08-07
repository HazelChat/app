import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { X } from "@untitledui/icons"
import { useChat } from "~/providers/chat-provider"
import { Button } from "../base/buttons/button"

interface ReplyIndicatorProps {
	replyToMessageId: Id<"messages">
	onClose: () => void
}

export function ReplyIndicator({ replyToMessageId, onClose }: ReplyIndicatorProps) {
	const { channelId, organizationId } = useChat()

	const { data: message, isLoading } = useQuery(
		convexQuery(api.messages.getMessage, {
			id: replyToMessageId,
			channelId,
			organizationId,
		}),
	)

	if (isLoading) {
		return (
			<div className="flex items-center justify-between gap-2 rounded-t-lg border border-primary border-b-0 bg-secondary px-3 py-2">
				<div className="flex items-center gap-2 text-sm">
					<div className="flex animate-pulse items-center gap-2">
						<div className="h-4 w-16 rounded bg-quaternary" />
						<div className="h-4 w-24 rounded bg-quaternary" />
						<div className="h-4 w-32 rounded bg-quaternary" />
					</div>
				</div>
				<div className="!p-1">
					<div className="size-3.5" />
				</div>
			</div>
		)
	}

	if (!message) {
		return null
	}

	return (
		<div className="flex items-center justify-between gap-2 rounded-t-lg border border-primary border-b-0 bg-secondary px-3 py-2">
			<div className="flex items-center gap-2 text-sm">
				<span className="text-secondary">Replying to</span>
				<span className="font-semibold text-primary">
					{message.author.firstName} {message.author.lastName}
				</span>
				<span className="max-w-xs truncate text-secondary">{message.content.split("\n")[0]}</span>
			</div>
			<Button size="sm" color="tertiary" onClick={onClose} aria-label="Cancel reply" className="!p-1">
				<X className="size-3.5" />
			</Button>
		</div>
	)
}
