"use client"

import type { ReactNode } from "react"
import { cn } from "~/lib/utils"
import { embedSectionStyles, useEmbedContext } from "./embed"

export interface EmbedAuthorProps {
	/** URL for the author's icon/logo */
	iconUrl?: string
	/** Author/source name to display */
	name: ReactNode
	/** Optional URL to link the author name */
	url?: string
	/** Additional content to render on the right side (e.g., status badge) */
	trailing?: ReactNode
	/** Additional class names */
	className?: string
}

/**
 * Author row for the embed - typically shows provider branding.
 * Example: [Linear icon] ENG-123 [Status badge]
 */
export function EmbedAuthor({ iconUrl, name, url, trailing, className }: EmbedAuthorProps) {
	const { accentColor } = useEmbedContext()

	const nameElement = (
		<span className="font-medium font-mono text-xs" style={{ color: accentColor || "var(--color-fg)" }}>
			{name}
		</span>
	)

	return (
		<div
			className={cn(embedSectionStyles({ position: "top" }), "flex items-center gap-2", className)}
			style={{
				background: accentColor
					? `linear-gradient(to right, ${accentColor}08, transparent)`
					: undefined,
			}}
		>
			{iconUrl && <img src={iconUrl} alt="" className="size-5 rounded-sm" />}

			{url ? (
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{nameElement}
				</a>
			) : (
				nameElement
			)}

			{trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
		</div>
	)
}
