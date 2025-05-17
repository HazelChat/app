// src/parser.ts
import type { ParsedSegment, TokenRule } from "./types"

interface MatchInfo {
	startIndex: number
	endIndex: number
	rule: TokenRule
	matchResult: RegExpMatchArray // Full match result
}

export function parseText(text: string, rules: TokenRule[]): ParsedSegment[] {
	if (!text) return []

	const allMatches: MatchInfo[] = []

	for (const rule of rules) {
		const regex = new RegExp(rule.regex, rule.regex.flags.includes("g") ? rule.regex.flags : rule.regex.flags + "g")
		for (const match of text.matchAll(regex)) {
			if (match.index !== undefined) {
				allMatches.push({
					startIndex: match.index,
					endIndex: match.index + match[0].length,
					rule: rule,
					matchResult: match,
				})
			}
		}
	}

	allMatches.sort((a, b) => {
		if (a.startIndex !== b.startIndex) {
			return a.startIndex - b.startIndex
		}
		return b.endIndex - b.startIndex - (a.endIndex - a.startIndex)
	})

	const segments: ParsedSegment[] = []
	let currentIndex = 0

	const filteredMatches: MatchInfo[] = []
	let lastMatchEnd = 0
	for (const match of allMatches) {
		if (match.startIndex >= lastMatchEnd) {
			filteredMatches.push(match)
			lastMatchEnd = match.endIndex
		}
	}

	for (const { startIndex, endIndex, rule, matchResult } of filteredMatches) {
		if (startIndex > currentIndex) {
			segments.push({ text: text.substring(currentIndex, startIndex) })
		}

		if (rule.isCodeBlock && matchResult) {
			const fullMatchText = matchResult[0]
			// Assumes regex: /```(\w*)?\n?([\s\S]*?)\n?```/g
			// Group 1: language (optional)
			// Group 2: code content
			const lang = matchResult[1] || undefined
			const codeContent = matchResult[2] || ""

			let openingDelimiterText: string
			let closingDelimiterText: string

			// Use matchResult.indices if available (ES2018+) for precise delimiter extraction
			if (matchResult.indices && matchResult.indices[2]) {
				// indices[2] is [start, end] for the codeContent group
				// Convert to offsets relative to the start of fullMatchText
				const contentStartInFullMatch = matchResult.indices[2][0] - matchResult.index
				const contentEndInFullMatch = matchResult.indices[2][1] - matchResult.index

				openingDelimiterText = fullMatchText.substring(0, contentStartInFullMatch)
				closingDelimiterText = fullMatchText.substring(contentEndInFullMatch)
			} else {
				// Fallback if .indices is not available (less precise for newlines in delimiters)
				console.warn(
					"RegExpMatchArray.indices not available. Code block delimiter parsing might be less precise.",
				)
				openingDelimiterText = "```" + (lang || "")
				if (fullMatchText.startsWith(openingDelimiterText + "\n" + codeContent)) {
					openingDelimiterText += "\n"
				} else if (!lang && fullMatchText.startsWith("```\n" + codeContent)) {
					openingDelimiterText = "```\n"
				}
				closingDelimiterText = "```" // Simplified fallback
			}

			segments.push({
				text: openingDelimiterText,
				className: rule.className, // Style for the ``` delimiters
				isToken: true,
			})
			segments.push({
				text: codeContent,
				isCodeBlockContent: true,
				language: lang,
				// No className here, highlight.js will provide its own
			})
			segments.push({
				text: closingDelimiterText,
				className: rule.className, // Style for the ``` delimiters
				isToken: true,
			})
		} else {
			// Standard token
			segments.push({
				text: matchResult[0],
				className: rule.className,
				isToken: true,
			})
		}
		currentIndex = endIndex
	}

	if (currentIndex < text.length) {
		segments.push({ text: text.substring(currentIndex) })
	}

	return segments
}
