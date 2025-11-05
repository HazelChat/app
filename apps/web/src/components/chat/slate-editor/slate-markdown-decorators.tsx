import type { BaseRange } from "slate"
import type { RenderLeafProps } from "slate-react"

// Markdown patterns for Discord-style highlighting
const MARKDOWN_PATTERNS = [
	{
		pattern: /(\*\*)([^*]+)(\*\*)/g,
		type: "bold" as const,
	},
	{
		pattern: /(\*)([^*]+)(\*)/g,
		type: "italic" as const,
	},
	{
		pattern: /(~~)([^~]+)(~~)/g,
		type: "strikethrough" as const,
	},
	{
		pattern: /(`)([^`]+)(`)/g,
		type: "code" as const,
	},
	{
		pattern: /(__)([^_]+)(__)/g,
		type: "underline" as const,
	},
	{
		pattern: /(\|\|)([^|]+)(\|\|)/g,
		type: "spoiler" as const,
	},
] as const

// Mention pattern: @[Display Name](userId)
const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g

export type MarkdownDecorationType = (typeof MARKDOWN_PATTERNS)[number]["type"] | "mention"

export interface MarkdownRange extends BaseRange {
	[key: string]: unknown
	type: MarkdownDecorationType
	isMarker?: boolean
}

/**
 * Decorate text nodes with markdown syntax highlighting
 * This makes the markdown tokens visible but styled (Discord-style)
 * @param entry - The node and path tuple
 * @param parentElement - Optional parent element to check type
 */
export function decorateMarkdown(entry: [node: any, path: number[]], parentElement?: any): MarkdownRange[] {
	const [node, path] = entry
	const ranges: MarkdownRange[] = []

	if (!node.text) {
		return ranges
	}

	// Skip markdown decoration in code blocks
	if (parentElement?.type === "code-block") {
		return ranges
	}

	const text = node.text

	// Decorate mentions first (they have higher priority)
	const mentionMatches = text.matchAll(MENTION_PATTERN)
	for (const match of mentionMatches) {
		if (match.index === undefined) continue

		const fullMatch = match[0] // Full match: @[Name](userId)

		// Mark entire mention as a single range
		ranges.push({
			anchor: { path, offset: match.index },
			focus: { path, offset: match.index + fullMatch.length },
			type: "mention",
			isMarker: false,
		})
	}

	// Decorate other markdown patterns
	for (const { pattern, type } of MARKDOWN_PATTERNS) {
		const matches = text.matchAll(pattern)

		for (const match of matches) {
			if (match.index === undefined) continue

			const fullMatch = match[0]
			const openMarker = match[1]
			const content = match[2]
			const closeMarker = match[3]

			// Skip if the markers are escaped or incomplete
			if (!openMarker || !content || !closeMarker) continue

			// Skip if this overlaps with a mention
			const mentionOverlap = ranges.some(
				(range) =>
					range.type === "mention" &&
					match.index !== undefined &&
					match.index < range.focus.offset &&
					match.index + fullMatch.length > range.anchor.offset,
			)
			if (mentionOverlap) continue

			// Opening marker range
			ranges.push({
				anchor: { path, offset: match.index },
				focus: { path, offset: match.index + openMarker.length },
				type,
				isMarker: true,
			})

			// Content range
			ranges.push({
				anchor: { path, offset: match.index + openMarker.length },
				focus: { path, offset: match.index + openMarker.length + content.length },
				type,
				isMarker: false,
			})

			// Closing marker range
			ranges.push({
				anchor: { path, offset: match.index + openMarker.length + content.length },
				focus: { path, offset: match.index + fullMatch.length },
				type,
				isMarker: true,
			})
		}
	}

	return ranges
}

/**
 * Render leaf with markdown styling
 * Markers are dimmed, content is styled
 */
export function MarkdownLeaf({ attributes, children, leaf }: RenderLeafProps) {
	// Base classes for all markdown leaves
	let className = ""

	// Check if this leaf has markdown decoration
	const markdownType = (leaf as any).type as MarkdownDecorationType | undefined
	const isMarker = (leaf as any).isMarker as boolean | undefined

	if (markdownType) {
		if (isMarker) {
			// Style the markers (**, *, ~~, `, etc.) - make them dimmed
			className = "text-muted-fg/50 select-none"
		} else {
			// Style the content based on type
			switch (markdownType) {
				case "bold":
					className = "font-bold"
					break
				case "italic":
					className = "italic"
					break
				case "strikethrough":
					className = "line-through"
					break
				case "code":
					className = "bg-accent/50 rounded px-1 py-0.5 font-mono text-sm"
					break
				case "underline":
					className = "underline"
					break
				case "spoiler":
					className = "bg-muted blur-sm hover:blur-none transition-all"
					break
				case "mention":
					// Style mentions with blue background and text
					className =
						"bg-primary/10 text-primary rounded px-1 py-0.5 font-medium cursor-pointer hover:bg-primary/20 transition-colors"
					break
			}
		}
	}

	return (
		<span {...attributes} className={className}>
			{children}
		</span>
	)
}
