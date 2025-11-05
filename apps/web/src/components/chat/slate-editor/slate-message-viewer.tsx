"use client"

import { memo, useCallback, useMemo } from "react"
import { createEditor, Editor } from "slate"
import { withHistory } from "slate-history"
import { Editable, type RenderElementProps, type RenderLeafProps, Slate, withReact } from "slate-react"
import { cx } from "~/utils/cx"
import { MentionLeaf } from "./mention-leaf"
import { decorateMarkdown } from "./slate-markdown-decorators"
import { type CustomElement, deserializeFromMarkdown } from "./slate-markdown-serializer"

interface SlateMessageViewerProps {
	content: string
	className?: string
}

// Define custom element renderer (same as editor but readonly optimized)
const Element = ({ attributes, children, element }: RenderElementProps) => {
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
						className="absolute top-0 left-0 h-full w-1 rounded-[2px] bg-primary"
						aria-hidden="true"
					/>
					{children}
				</blockquote>
			)
		case "code-block":
			return (
				<pre
					{...attributes}
					className="my-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm"
					data-language={customElement.language}
				>
					<code>{children}</code>
				</pre>
			)
		default:
			return <p {...attributes}>{children}</p>
	}
}

// Define custom leaf renderer with markdown highlighting and interactive mentions
const Leaf = (props: RenderLeafProps) => {
	return <MentionLeaf {...props} interactive={true} />
}

export const SlateMessageViewer = memo(({ content, className }: SlateMessageViewerProps) => {
	// Create a readonly Slate editor
	const editor = useMemo(() => withHistory(withReact(createEditor())), [])

	// Deserialize markdown content to Slate value
	const value = useMemo(() => deserializeFromMarkdown(content), [content])

	// Custom decorator that checks parent element type
	const decorate = useCallback(
		(entry: [node: any, path: number[]]) => {
			const [, nodePath] = entry

			// Get parent element
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
						"w-full cursor-text select-text whitespace-pre-wrap break-words text-sm",
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
