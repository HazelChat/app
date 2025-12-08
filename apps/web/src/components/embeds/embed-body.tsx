"use client"

import type { ReactNode } from "react"
import { cn } from "~/lib/utils"
import { useEmbedContext } from "./embed"
import { EmbedMarkdown } from "./embed-markdown"

export interface EmbedBodyProps {
	/** Main title text */
	title: string
	/** Optional URL to link the title */
	titleUrl?: string
	/** Optional description text (will be truncated) */
	description?: string | null
	/** Max characters for description before truncating */
	descriptionMaxLength?: number
	/** Additional content to render below the description */
	children?: ReactNode
	/** Additional class names */
	className?: string
}

/**
 * Main body content of the embed with title and description.
 */
export function EmbedBody({
	title,
	titleUrl,
	description,
	descriptionMaxLength = 200,
	children,
	className,
}: EmbedBodyProps) {
	const { accentColor, url: embedUrl } = useEmbedContext()

	const truncatedDescription =
		description && description.length > descriptionMaxLength
			? `${description.slice(0, descriptionMaxLength)}...`
			: description

	const titleElement = (
		<h4 className="font-semibold text-fg text-sm leading-snug">
			<EmbedMarkdown>{title}</EmbedMarkdown>
		</h4>
	)

	return (
		<div className={cn("p-3", className)}>
			{titleUrl ? (
				<a
					href={titleUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{titleElement}
				</a>
			) : (
				titleElement
			)}

			{truncatedDescription && (
				<p className="mt-1.5 line-clamp-2 text-muted-fg text-xs leading-relaxed">
					<EmbedMarkdown>{truncatedDescription}</EmbedMarkdown>
				</p>
			)}

			{children}
		</div>
	)
}
