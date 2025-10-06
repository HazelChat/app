import type { MessageId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { messageCollection, userCollection } from "~/db/collections"
import { useMessage } from "~/db/hooks"
import { Button } from "../base/buttons/button"
import IconClose from "../icons/icon-close"

interface ReplyIndicatorProps {
	replyToMessageId: MessageId
	onClose: () => void
}

export function ReplyIndicator({ replyToMessageId, onClose }: ReplyIndicatorProps) {
	const { data, isLoading } = useMessage(replyToMessageId)

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

	if (!data) {
		return null
	}

	return (
		<div className="flex items-center justify-between gap-2 rounded-t-lg border border-primary border-b-0 bg-secondary px-3 py-2">
			<div className="flex items-center gap-2 text-sm">
				<span className="text-secondary">Replying to</span>
				<span className="font-semibold text-primary">
					{data.author.firstName} {data.author.lastName}
				</span>
				<span className="max-w-xs truncate text-secondary">{data.content.split("\n")[0]}</span>
			</div>
			<Button size="sm" color="tertiary" onClick={onClose} aria-label="Cancel reply" className="!p-1">
				<IconClose className="size-3.5" />
			</Button>
		</div>
	)
}
