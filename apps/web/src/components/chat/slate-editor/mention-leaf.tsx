"use client"

import { Result, useAtomValue } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/db/schema"
import { Button as PrimitiveButton } from "react-aria-components"
import type { RenderLeafProps } from "slate-react"
import { userWithPresenceAtomFamily } from "~/atoms/message-atoms"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Popover, PopoverContent } from "~/components/ui/popover"
import { cn } from "~/lib/utils"
import { type MarkdownDecorationType, MarkdownLeaf } from "./slate-markdown-decorators"
import { extractMentions } from "./slate-mention-plugin"

interface MentionLeafProps extends RenderLeafProps {
	/** Whether to make mentions interactive (clickable) */
	interactive?: boolean
}

/**
 * Leaf renderer with interactive mentions support
 * Extends MarkdownLeaf to add click handlers and popovers for mentions
 */
export function MentionLeaf({ interactive = false, leaf, children, ...props }: MentionLeafProps) {
	// Check if this leaf is a mention - MUST be before any hooks
	const markdownType = (leaf as any).type as MarkdownDecorationType | undefined
	const isMention = markdownType === "mention"

	// Extract userId from the mention text
	const text = (leaf as any).text as string
	const mentions = text ? extractMentions(text) : []
	const mention = mentions[0]
	const userId = mention?.userId

	// Skip popover for special mentions
	const isSpecialMention = userId === "channel" || userId === "here"

	// Determine if we should fetch user data
	const shouldFetchUser = isMention && userId && !isSpecialMention

	// IMPORTANT: Hooks must be called unconditionally
	// Always call hooks in the same order, but only use the result if needed
	const userPresenceResult = useAtomValue(
		userWithPresenceAtomFamily((shouldFetchUser ? userId : "dummy-id") as UserId)
	)
	const data = shouldFetchUser && userPresenceResult ? Result.getOrElse(userPresenceResult, () => []) : []
	const result = data[0]
	const user = result?.user
	const presence = result?.presence

	// If not a mention, just use the regular MarkdownLeaf
	if (!isMention) {
		return (
			<MarkdownLeaf {...props} leaf={leaf}>
				{children}
			</MarkdownLeaf>
		)
	}

	// For special mentions (@channel, @here), render with the display name
	if (isSpecialMention) {
		return (
			<MarkdownLeaf {...props} leaf={leaf}>
				@{mention?.displayName || children}
			</MarkdownLeaf>
		)
	}

	const fullName = user ? `${user.firstName} ${user.lastName}` : mention?.displayName || "Unknown"

	// If not interactive, just render the mention text without popover
	if (!interactive) {
		return (
			<MarkdownLeaf {...props} leaf={leaf}>
				@{fullName}
			</MarkdownLeaf>
		)
	}

	const getStatusColor = (status?: string) => {
		switch (status) {
			case "online":
				return "bg-success"
			case "away":
			case "busy":
				return "bg-warning"
			case "dnd":
				return "bg-danger"
			default:
				return "bg-muted"
		}
	}

	// Render interactive mention with popover
	return (
		<Popover>
			<PrimitiveButton className="inline cursor-pointer outline-hidden">
				<MarkdownLeaf {...props} leaf={leaf}>
					@{fullName}
				</MarkdownLeaf>
			</PrimitiveButton>

			<PopoverContent placement="top" className="w-64 p-0">
				<div className="space-y-3 p-4">
					{/* User header */}
					<div className="flex items-center gap-3">
						{/* Avatar with status */}
						<div className="relative shrink-0">
							<Avatar size="md" alt={fullName} src={user?.avatarUrl || ""} />
							{presence?.status && (
								<span
									className={cn(
										"absolute right-0 bottom-0 size-3 rounded-full border-2 border-bg",
										getStatusColor(presence.status),
									)}
								/>
							)}
						</div>

						{/* User info */}
						<div className="min-w-0 flex-1">
							<div className="truncate font-semibold text-sm">{fullName}</div>
							{user && <div className="truncate text-muted-fg text-xs">{user.email}</div>}
						</div>
					</div>

					{/* Custom status message */}
					{presence?.customMessage && (
						<div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
							{presence.customMessage}
						</div>
					)}

					{/* Action button */}
					<Button size="sm" intent="primary" className="w-full">
						Send Message
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
