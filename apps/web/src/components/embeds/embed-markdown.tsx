"use client"

import type { ReactNode } from "react"
import { cn } from "~/lib/utils"

export interface EmbedMarkdownProps {
	/** The markdown text to render */
	children: string
	/** Additional class names */
	className?: string
}

interface ParsedSegment {
	type: "text" | "bold" | "italic" | "strikethrough" | "code" | "link" | "url"
	content: string
	url?: string
	children?: ParsedSegment[]
}

/**
 * Parses inline markdown and returns an array of segments
 */
function parseInlineMarkdown(text: string): ParsedSegment[] {
	const segments: ParsedSegment[] = []
	let remaining = text

	// Combined regex for all patterns - order matters (more specific first)
	const patterns = [
		// Bold: **text** or __text__
		{ regex: /^\*\*(.+?)\*\*/, type: "bold" as const },
		{ regex: /^__(.+?)__/, type: "bold" as const },
		// Italic: *text* or _text_ (but not ** or __)
		{ regex: /^\*([^*]+?)\*/, type: "italic" as const },
		{ regex: /^_([^_]+?)_/, type: "italic" as const },
		// Strikethrough: ~~text~~
		{ regex: /^~~(.+?)~~/, type: "strikethrough" as const },
		// Inline code: `text`
		{ regex: /^`([^`]+)`/, type: "code" as const },
		// Links: [text](url)
		{ regex: /^\[([^\]]+)\]\(([^)]+)\)/, type: "link" as const },
		// URLs: https://... or http://...
		{ regex: /^(https?:\/\/[^\s<>"\]]+)/, type: "url" as const },
	]

	while (remaining.length > 0) {
		let matched = false

		for (const pattern of patterns) {
			const match = remaining.match(pattern.regex)
			if (match && match[1] !== undefined) {
				const capturedContent = match[1]
				if (pattern.type === "link" && match[2] !== undefined) {
					segments.push({
						type: "link",
						content: capturedContent,
						url: match[2],
					})
				} else if (pattern.type === "url") {
					segments.push({
						type: "url",
						content: capturedContent,
						url: capturedContent,
					})
				} else {
					// For bold/italic/strikethrough/code, recursively parse inner content
					if (pattern.type === "code") {
						// Don't parse inside code blocks
						segments.push({
							type: pattern.type,
							content: capturedContent,
						})
					} else {
						segments.push({
							type: pattern.type,
							content: capturedContent,
							children: parseInlineMarkdown(capturedContent),
						})
					}
				}
				remaining = remaining.slice(match[0].length)
				matched = true
				break
			}
		}

		if (!matched) {
			// No pattern matched, consume one character as text
			const char = remaining[0]
			if (char !== undefined) {
				const lastSegment = segments[segments.length - 1]
				if (lastSegment?.type === "text") {
					lastSegment.content += char
				} else {
					segments.push({ type: "text", content: char })
				}
			}
			remaining = remaining.slice(1)
		}
	}

	return segments
}

/**
 * Renders parsed segments to React nodes
 */
function renderSegments(segments: ParsedSegment[]): ReactNode[] {
	return segments.map((segment, index) => {
		const key = `${segment.type}-${index}`

		switch (segment.type) {
			case "bold":
				return (
					<strong key={key} className="font-semibold">
						{segment.children ? renderSegments(segment.children) : segment.content}
					</strong>
				)
			case "italic":
				return (
					<em key={key} className="italic">
						{segment.children ? renderSegments(segment.children) : segment.content}
					</em>
				)
			case "strikethrough":
				return (
					<s key={key} className="line-through">
						{segment.children ? renderSegments(segment.children) : segment.content}
					</s>
				)
			case "code":
				return (
					<code key={key} className="rounded bg-muted/50 px-1 font-mono text-[0.85em]">
						{segment.content}
					</code>
				)
			case "link":
			case "url":
				return (
					<a
						key={key}
						href={segment.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-accent-fg hover:underline"
						onClick={(e) => e.stopPropagation()}
					>
						{segment.content}
					</a>
				)
			default:
				return <span key={key}>{segment.content}</span>
		}
	})
}

/**
 * Renders inline markdown text with support for:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Strikethrough: ~~text~~
 * - Inline code: `text`
 * - Links: [text](url)
 * - Auto-linked URLs
 */
export function EmbedMarkdown({ children, className }: EmbedMarkdownProps) {
	if (!children) return null

	const segments = parseInlineMarkdown(children)

	return <span className={cn(className)}>{renderSegments(segments)}</span>
}
