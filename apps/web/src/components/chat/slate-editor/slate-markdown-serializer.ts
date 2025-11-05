import { Node } from "slate"

// Define our custom element and text types
export interface ParagraphElement {
	type: "paragraph"
	children: CustomText[]
}

export interface BlockquoteElement {
	type: "blockquote"
	children: CustomText[]
}

export interface CodeBlockElement {
	type: "code-block"
	language?: string
	children: CustomText[]
}

export interface CustomText {
	text: string
}

export type CustomElement = ParagraphElement | BlockquoteElement | CodeBlockElement
export type CustomDescendant = CustomElement | CustomText

/**
 * Extract mentions from markdown text
 * Returns array of { userId, displayName } for each mention found
 */
export function extractMentionsFromMarkdown(
	markdown: string,
): Array<{ userId: string; displayName: string }> {
	const mentions: Array<{ userId: string; displayName: string }> = []
	const pattern = /@\[([^\]]+)\]\(([^)]+)\)/g
	let match: RegExpExecArray | null

	while ((match = pattern.exec(markdown)) !== null) {
		const displayName = match[1]
		const userId = match[2]

		if (displayName && userId) {
			mentions.push({
				displayName,
				userId,
			})
		}
	}

	return mentions
}

/**
 * Check if text contains mention pattern
 */
export function hasMentionPattern(text: string): boolean {
	return /@\[([^\]]+)\]\(([^)]+)\)/.test(text)
}

/**
 * Serialize Slate value to plain markdown string
 * This converts the editor content to markdown that can be sent to the backend
 */
export function serializeToMarkdown(nodes: CustomDescendant[]): string {
	return nodes
		.map((node) => {
			if ("text" in node) {
				return node.text
			}

			const element = node as CustomElement
			const text = Node.string(element)

			switch (element.type) {
				case "paragraph":
					return text
				case "blockquote":
					// Prefix each line with "> "
					return text
						.split("\n")
						.map((line) => `> ${line}`)
						.join("\n")
				case "code-block": {
					// Wrap in triple backticks with optional language
					const lang = element.language || ""
					return `\`\`\`${lang}\n${text}\n\`\`\``
				}
				default:
					return text
			}
		})
		.join("\n")
}

/**
 * Deserialize markdown string to Slate value
 * This converts markdown from the backend back to Slate nodes for editing
 */
export function deserializeFromMarkdown(markdown: string): CustomDescendant[] {
	if (!markdown || markdown.trim() === "") {
		return [
			{
				type: "paragraph",
				children: [{ text: "" }],
			},
		]
	}

	const nodes: CustomDescendant[] = []
	const lines = markdown.split("\n")
	let i = 0

	while (i < lines.length) {
		const line = lines[i]
		if (!line) {
			i++
			continue
		}

		// Check for code block (```)
		if (line.startsWith("```")) {
			const languageMatch = line.match(/^```(\w+)?/)
			const language = languageMatch?.[1] || undefined
			const codeLines: string[] = []

			i++ // Skip opening ```
			while (i < lines.length) {
				const codeLine = lines[i]
				if (!codeLine || codeLine.startsWith("```")) break
				codeLines.push(codeLine)
				i++
			}
			i++ // Skip closing ```

			nodes.push({
				type: "code-block",
				language,
				children: [{ text: codeLines.join("\n") }],
			})
			continue
		}

		// Check for multi-line blockquote (>>>)
		if (line.startsWith(">>> ")) {
			const quoteText = line.slice(4) // Remove ">>> "
			const restOfMessage = lines.slice(i + 1).join("\n")
			const fullQuote = restOfMessage ? `${quoteText}\n${restOfMessage}` : quoteText

			nodes.push({
				type: "blockquote",
				children: [{ text: fullQuote }],
			})
			break // Multi-line quote consumes rest of message
		}

		// Check for single-line blockquote (>)
		if (line.startsWith("> ")) {
			const quoteLines: string[] = []
			while (i < lines.length) {
				const quoteLine = lines[i]
				if (!quoteLine || !quoteLine.startsWith("> ")) break
				quoteLines.push(quoteLine.slice(2)) // Remove "> "
				i++
			}

			nodes.push({
				type: "blockquote",
				children: [{ text: quoteLines.join("\n") }],
			})
			continue
		}

		// Default: paragraph
		nodes.push({
			type: "paragraph",
			children: [{ text: line }],
		})
		i++
	}

	return nodes.length > 0 ? nodes : [{ type: "paragraph", children: [{ text: "" }] }]
}

/**
 * Create an empty Slate value
 */
export function createEmptyValue(): CustomDescendant[] {
	return [
		{
			type: "paragraph",
			children: [{ text: "" }],
		},
	]
}

/**
 * Check if Slate value is effectively empty
 */
export function isValueEmpty(nodes: CustomDescendant[]): boolean {
	if (!nodes || nodes.length === 0) return true

	const text = serializeToMarkdown(nodes).trim()

	// Remove normal whitespace + zero-width + non-breaking spaces
	const cleaned = text.replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, "")

	return cleaned.length === 0
}
