"use client"

import { memo, useCallback, useMemo } from "react"
import { createEditor, Editor, Element as SlateElement } from "slate"
import { withHistory } from "slate-history"
import { Editable, type RenderElementProps, type RenderLeafProps, Slate, withReact } from "slate-react"
import { isEmojiOnly } from "~/lib/emoji-utils"
import { cx } from "~/utils/cx"
import { CodeBlockElement } from "./code-block-element"
import { MentionLeaf } from "./mention-leaf"
import { decorateCodeBlock } from "./slate-code-decorator"
import { decorateMarkdown } from "./slate-markdown-decorators"
import { type CustomElement, deserializeFromMarkdown } from "./slate-markdown-serializer"

interface SlateMessageViewerProps {
	content: string
	className?: string
}

// Define custom element renderer (same as editor but readonly optimized)
const Element = (props: RenderElementProps) => {
	const { attributes, children, element } = props
	const customElement = element as CustomElement

	switch (customElement.type) {
		case "paragraph":
			return (
				<p {...attributes} className="my-0 last:empty:hidden">
					{children}
				</p>
			)
		case "blockquote":
			return (
				<blockquote {...attributes} className="relative my-1 pl-4 italic">
					<span
						className="absolute top-0 left-0 h-full w-1 rounded-xs bg-primary"
						aria-hidden="true"
					/>
					{children}
				</blockquote>
			)
		case "code-block":
			return <CodeBlockElement {...props} showControls={true} />
		default:
			return <p {...attributes}>{children}</p>
	}
}

// Define custom leaf renderer with markdown highlighting and interactive mentions
const Leaf = (props: RenderLeafProps) => {
	return <MentionLeaf {...props} interactive={true} mode="viewer" />
}

export const SlateMessageViewer = memo(({ content, className }: SlateMessageViewerProps) => {
	// Create a readonly Slate editor
	const editor = useMemo(() => withHistory(withReact(createEditor())), [])

	// Deserialize markdown content to Slate value
	const value = useMemo(() => deserializeFromMarkdown(content), [content])

	// Check if content contains only emojis
	const isOnlyEmojis = useMemo(() => isEmojiOnly(content), [content])

	// Custom decorator that handles both markdown and code syntax highlighting
	const decorate = useCallback(
		(entry: [node: any, path: number[]]) => {
			const [node, nodePath] = entry

			// Check if this node is a code-block element
			if (SlateElement.isElement(node) && (node as any).type === "code-block") {
				return decorateCodeBlock(entry)
			}

			// Get parent element for markdown decoration
			const parentPath = nodePath.slice(0, -1)
			const parentEntry = Editor.node(editor, parentPath)
			const parentElement = parentEntry ? parentEntry[0] : null

			return decorateMarkdown(entry, parentElement)
		},
		[editor],
	)

	return (
		<div className={cx("w-full", className)}>
			<Slate editor={editor} initialValue={value}>
				<Editable
					className={cx(
						"wrap-break-word w-full cursor-text select-text whitespace-pre-wrap",
						isOnlyEmojis ? "text-2xl" : "text-sm",
						"[&_strong]:font-bold",
					)}
					readOnly={true}
					renderElement={Element}
					renderLeaf={Leaf}
					decorate={decorate}
				/>
			</Slate>
		</div>
	)
})

SlateMessageViewer.displayName = "SlateMessageViewer"
