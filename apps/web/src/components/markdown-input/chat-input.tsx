import "highlight.js/styles/github-dark.css" // Example: GitHub Dark theme
import { createSignal } from "solid-js"
import { MarkdownInput } from "./markdown-input"
import type { TokenRule } from "./types"

const myTokenRules: TokenRule[] = [
	{
		name: "codeblock",
		// Regex: ``` (optional lang) \n? (content) \n? ```
		// Group 1: language (e.g., "js", "python") - optional
		// Group 2: the actual code content
		regex: /```(\w*)?\n?([\s\S]*?)\n?```/g,
		className: "text-teal-400 dark:text-teal-500 token-codeblock-delimiter", // For the ``` parts
		isCodeBlock: true,
	},
	{
		name: "bold",
		regex: /\*\*([^\*\s](?:[^\*]*[^\*\s])?)\*\*/g,
		className: "font-bold text-pink-500 token-bold",
	},
	{
		name: "italic",
		regex: /(?<!\*)\*([^\*\s](?:[^\*]*[^\*\s])?)\*(?!\*)/g,
		className: "italic text-sky-500 token-italic",
	},
	{
		name: "strikethrough",
		regex: /~~([^~\s](?:[^~]*[^\~\s])?)~~/g,
		className: "line-through text-red-500 token-strikethrough",
	},
	{
		name: "inline-code",
		// Ensure this doesn't capture parts of code blocks if regexes are not careful
		regex: /`([^`\n]+?)`/g, // Avoid newlines in inline code
		className:
			"bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-mono px-1 py-0.5 rounded text-sm token-inline-code",
	},
	{
		name: "link",
		regex: /\[([^\]]+)\]\(([^\)]+)\)/g,
		className: "text-blue-500 underline token-link",
	},
]

export const ChatInput = () => {
	const [inputValue, setInputValue] = createSignal(
		"Hello **world**! This is *italic*.\n\n```javascript\n// This is a JS code block\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\ngreet('Solid');\n```\n\nAnd `inline code` here. Plus a ```python\n# Python code\nprint('Hello from Python')\n```\nFinal text.",
	)
	return (
		<MarkdownInput
			value={inputValue}
			onValueChange={setInputValue}
			tokenRules={myTokenRules}
			placeholder="Type your Markdown here..."
			inputClass="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
		/>
	)
}
