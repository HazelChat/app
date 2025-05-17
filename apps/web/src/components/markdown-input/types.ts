export interface TokenRule {
	name: string
	regex: RegExp // RegExp should have the global 'g' flag
	className: string // For simple tokens or delimiters of complex tokens
	isCodeBlock?: boolean // True if this rule defines a code block
}

export interface ParsedSegment {
	text: string
	className?: string // For styling tokens or plain text wrappers
	isToken?: boolean // True if this segment is a markdown token itself
	isCodeBlockContent?: boolean // True if this segment is the content of a code block
	language?: string // Language for code block content (e.g., "javascript")
}
