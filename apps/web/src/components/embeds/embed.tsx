"use client"

import { createContext, type ReactNode, use } from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { cn } from "~/lib/utils"

// ============================================================================
// Shared Embed Styles
// ============================================================================

/**
 * Container styles for embed components (Embed, EmbedError, EmbedSkeleton)
 */
export const embedContainerStyles = tv({
	base: ["mt-2 flex max-w-md overflow-hidden", "border border-border/60 bg-muted"],
	variants: {
		variant: {
			default: "flex-col rounded-r-lg border-l-2! transition-all duration-200",
			error: "items-center gap-3 rounded-r-lg border-l-2! p-3",
			skeleton: "flex-col rounded-lg border-l-4",
		},
	},
	defaultVariants: {
		variant: "default",
	},
})

/**
 * Section styles for embed internal sections (Author, Footer, Fields, Image)
 */
export const embedSectionStyles = tv({
	base: "border-border",
	variants: {
		position: {
			top: "border-b",
			bottom: "border-t",
		},
		padding: {
			default: "px-3 py-2",
			compact: "px-3 py-1.5",
			none: "",
		},
	},
	defaultVariants: {
		padding: "default",
	},
})

export type EmbedContainerVariants = VariantProps<typeof embedContainerStyles>
export type EmbedSectionVariants = VariantProps<typeof embedSectionStyles>

// Embed context for sharing accent color with children
interface EmbedContextValue {
	accentColor?: string
	url?: string
}

const EmbedContext = createContext<EmbedContextValue | null>(null)

export const useEmbedContext = () => {
	const context = use(EmbedContext)
	if (!context) {
		throw new Error("Embed components must be used within an Embed")
	}
	return context
}

export interface EmbedProps {
	/** Accent color for the left border (e.g., "#5E6AD2" for Linear) */
	accentColor?: string
	/** Optional URL to make the entire embed clickable */
	url?: string
	/** Additional class names */
	className?: string
	children: ReactNode
}

/**
 * Discord-style embed container with colored left border.
 * Use compound components like Embed.Author, Embed.Body, etc.
 */
export function Embed({ accentColor, url, className, children }: EmbedProps) {
	const content = (
		<div
			className={cn(
				embedContainerStyles({ variant: "default" }),
				url && "hover:border-border",
				className,
			)}
			style={{
				borderLeftColor: accentColor || "var(--color-border)",
			}}
		>
			{children}
		</div>
	)

	if (url) {
		return (
			<EmbedContext value={{ accentColor, url }}>
				<a href={url} target="_blank" rel="noopener noreferrer" className="block">
					{content}
				</a>
			</EmbedContext>
		)
	}

	return <EmbedContext value={{ accentColor, url }}>{content}</EmbedContext>
}
