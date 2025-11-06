import Prism from "prismjs"
import "prismjs/components/prism-bash"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-csharp"
import "prismjs/components/prism-css"
import "prismjs/components/prism-diff"
import "prismjs/components/prism-go"
import "prismjs/components/prism-graphql"
import "prismjs/components/prism-java"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-json"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-kotlin"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-php"
import "prismjs/components/prism-python"
import "prismjs/components/prism-ruby"
import "prismjs/components/prism-rust"
import "prismjs/components/prism-scss"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-swift"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-yaml"
import { Element, Node, type NodeEntry, type Range } from "slate"

// Flatten nested tokens into a single-level array with types
interface NormalizedToken {
	types: string[]
	content: string
}

function normalizeTokens(tokens: Array<string | Prism.Token>): NormalizedToken[] {
	const normalized: NormalizedToken[] = []

	function flatten(token: string | Prism.Token, types: string[] = []): void {
		if (typeof token === "string") {
			if (token.length > 0) {
				normalized.push({ types, content: token })
			}
		} else {
			const newTypes = types.concat(token.type)

			if (Array.isArray(token.content)) {
				for (const child of token.content) {
					flatten(child, newTypes)
				}
			} else {
				flatten(token.content, newTypes)
			}
		}
	}

	for (const token of tokens) {
		flatten(token)
	}

	return normalized
}

export function decorateCodeBlock([block, blockPath]: NodeEntry): Range[] {
	if (!Element.isElement(block) || (block as any).type !== "code-block") {
		return []
	}

	const language = (block as any).language || "plaintext"
	const grammar = Prism.languages[language]

	if (!grammar) {
		return []
	}

	// Get all text from code block
	const text = (block as any).children.map((line: any) => Node.string(line)).join("\n")

	// Tokenize with Prism
	const tokens = Prism.tokenize(text, grammar)
	const normalizedTokens = normalizeTokens(tokens)

	const decorations: any[] = []
	let offset = 0

	for (const token of normalizedTokens) {
		const length = token.content.length
		if (!length) continue

		const end = offset + length

		// Create decoration range with token types as properties
		const decoration: any = {
			anchor: { path: [...blockPath, 0, 0], offset },
			focus: { path: [...blockPath, 0, 0], offset: end },
			token: true,
		}

		// Add each token type as a property
		for (const type of token.types) {
			decoration[type] = true
		}

		decorations.push(decoration)
		offset = end
	}

	return decorations
}
