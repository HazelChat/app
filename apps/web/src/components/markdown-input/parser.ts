export type BaseTokenType =
	| "text"
	| "codeblock"
	| "header1"
	| "header2"
	| "header3"
	| "header4"
	| "header5"
	| "header6"
	| "bold"
	| "italic"
	| "inlinecode"

export interface TokenPattern<T extends string> {
	type: T
	pattern: RegExp
}

export interface Token<T extends string> {
	type: T
	content: string
	// parsedContent: string
	// prefix: string
	// postfix: string
}

export function parseMarkdownTokens<CustomTokenType extends string = never>(
	markdown: string,
	additionalPatterns: TokenPattern<CustomTokenType>[] = [],
): Array<Token<BaseTokenType | CustomTokenType>> {
	type TokenType = BaseTokenType | CustomTokenType
	const tokens: Array<Token<TokenType>> = []

	// Define base token patterns
	const basePatterns: TokenPattern<BaseTokenType>[] = [
		{ type: "codeblock", pattern: /```[\s\S]*?```/g },
		{ type: "header1", pattern: /^# .+$/gm },
		{ type: "header2", pattern: /^## .+$/gm },
		{ type: "header3", pattern: /^### .+$/gm },
		{ type: "bold", pattern: /\*\*[^*]+\*\*/g },
		{ type: "italic", pattern: /\*[^*]+\*/g },
		{ type: "inlinecode", pattern: /`[^`]+`/g },
	]

	// Combine base and additional patterns
	const tokenPatterns: Array<TokenPattern<TokenType>> = [...basePatterns, ...additionalPatterns]

	// Create a map of character positions to token info
	const markedPositions = new Map<number, { end: number; type: TokenType }>()

	// Find all tokens and mark their positions
	for (const { type, pattern } of tokenPatterns) {
		let match: RegExpExecArray | null
		// Clone the regex to reset lastIndex
		const regex = new RegExp(pattern.source, pattern.flags)
		// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
		while ((match = regex.exec(markdown)) !== null) {
			const start = match.index
			const end = start + match[0].length

			// Only store this token if it doesn't overlap with a higher priority token
			let canAdd = true
			for (const [existingStart, { end: existingEnd }] of markedPositions.entries()) {
				if (
					(start >= existingStart && start < existingEnd) ||
					(end > existingStart && end <= existingEnd) ||
					(start <= existingStart && end >= existingEnd)
				) {
					canAdd = false
					break
				}
			}

			if (canAdd) {
				markedPositions.set(start, { end, type })
			}
		}
	}

	// Convert the map to a sorted array of positions
	const positions = Array.from(markedPositions.entries()).sort(([startA], [startB]) => startA - startB)

	// Build the tokens array
	let lastIndex = 0
	for (const [start, { end, type }] of positions) {
		// Add text token for content before this token
		if (start > lastIndex) {
			tokens.push({ type: "text", content: markdown.slice(lastIndex, start) })
		}

		// Add the token itself
		tokens.push({ type, content: markdown.slice(start, end) })
		lastIndex = end
	}

	// Add any remaining text
	if (lastIndex < markdown.length) {
		tokens.push({ type: "text", content: markdown.slice(lastIndex) })
	}

	return tokens
}
