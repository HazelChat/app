"use client"

import type { Id } from "@hazel/backend"
import { createSlatePlugin, type Decorate, type RenderLeafProps, TextApi, type TText } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import Prism from "prismjs"
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react"
import { Node } from "slate"
import { BasicNodesKit } from "~/components/editor/plugins/basic-nodes-kit"
import { Editor, EditorContainer } from "~/components/ui/editor"
import { cn } from "~/lib/utils"
import { MessageComposerActions } from "./chat/message-composer-actions"

import "prismjs/components/prism-markdown.js"
import { cx } from "~/utils/cx"
import { MarkdownKit } from "./editor/plugins/markdown-kit"
import { MentionKit } from "./editor/plugins/mention-kit"

/** Decorate texts with markdown preview. */
const decoratePreview: Decorate = ({ entry: [node, path] }) => {
	const ranges: any[] = []

	if (!TextApi.isText(node)) {
		return ranges
	}

	const getLength = (token: any) => {
		if (typeof token === "string") {
			return token.length
		}
		if (typeof token.content === "string") {
			return token.content.length
		}

		return token.content.reduce((l: any, t: any) => l + getLength(t), 0)
	}

	const processTokens = (tokens: any[], currentStart: number) => {
		let start = currentStart

		for (const token of tokens) {
			const length = getLength(token)
			const end = start + length

			if (typeof token !== "string") {
				// For code blocks, process nested tokens
				if (token.type === "code" && Array.isArray(token.content)) {
					let innerStart = start
					for (const innerToken of token.content) {
						const innerLength = getLength(innerToken)
						const innerEnd = innerStart + innerLength

						if (typeof innerToken !== "string") {
							if (innerToken.type === "punctuation") {
								ranges.push({
									anchor: { offset: innerStart, path },
									focus: { offset: innerEnd, path },
									"code-punctuation": true,
								})
							} else if (innerToken.type === "code-block") {
								ranges.push({
									anchor: { offset: innerStart, path },
									focus: { offset: innerEnd, path },
									"code-block": true,
								})
							} else if (innerToken.type === "code-language") {
								ranges.push({
									anchor: { offset: innerStart, path },
									focus: { offset: innerEnd, path },
									"code-language": true,
								})
							}
						}

						innerStart = innerEnd
					}
				} else {
					ranges.push({
						anchor: { offset: start, path },
						focus: { offset: end, path },
						[token.type]: true,
					})
				}
			}

			start = end
		}
	}

	const tokens = Prism.tokenize(node.text, Prism.languages.markdown)
	processTokens(tokens, 0)

	return ranges
}

function PreviewLeaf({
	attributes,
	children,
	leaf,
}: RenderLeafProps<
	{
		blockquote?: boolean
		bold?: boolean
		code?: boolean
		"code-snippet"?: boolean
		"code-block"?: boolean
		"code-punctuation"?: boolean
		"code-language"?: boolean
		hr?: boolean
		italic?: boolean
		list?: boolean
		title?: boolean
	} & TText
>) {
	const { blockquote, bold, code, hr, italic, list, title } = leaf
	const codeSnippet = leaf["code-snippet"]
	const codeBlock = leaf["code-block"]
	const codePunctuation = leaf["code-punctuation"]
	const codeLanguage = leaf["code-language"]

	return (
		<span
			{...attributes}
			className={cn(
				bold && "font-bold",
				italic && "italic",
				title && "inline-block font-bold text-xl",
				list && "pl-2.5 text-xl leading-2.5",
				hr && "block border-secondary border-b-2 text-center",
				blockquote && "inline-block border-secondary border-l-3 pl-2.5 text-brand-primary italic",
				codeSnippet && "rounded-md border border-primary bg-secondary p-0.5 font-mono text-xs",
				codeBlock && "font-mono text-secondary",
				codePunctuation && "text-tertiary",
				codeLanguage && "font-mono text-tertiary",
				code && !codeSnippet && !codeBlock && "font-mono",
			)}
		>
			{children}
		</span>
	)
}

export interface MarkdownEditorRef {
	focusAndInsertText: (text: string) => void
	clearContent: () => void
}

interface MarkdownEditorProps {
	placeholder?: string
	className?: string
	onSubmit?: (content: string) => void | Promise<void>
	onUpdate?: (content: string) => void
	attachmentIds?: Id<"attachments">[]
	setAttachmentIds?: (ids: Id<"attachments">[]) => void
	uploads?: Array<{
		fileId: string
		fileName: string
		progress: number
		status: string
		attachmentId?: Id<"attachments">
	}>
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
	(
		{
			placeholder = "Type a message...",
			className,
			onSubmit,
			onUpdate,
			attachmentIds = [],
			setAttachmentIds,
			uploads = [],
		},
		ref,
	) => {
		const actionsRef = useRef<{ cleanup: () => void } | null>(null)

		const editor = usePlateEditor(
			{
				plugins: [
					...BasicNodesKit,
					...MarkdownKit,
					// ...MentionKit,
					createSlatePlugin({
						key: "preview-markdown",
						decorate: decoratePreview,
					}),
				],
			},
			[],
		)

		// Helper to focus the actual DOM element
		const focusEditor = useCallback(() => {
			const editorElement = document.querySelector('[data-slate-editor="true"]') as HTMLElement
			editorElement?.focus()
		}, [])

		// Helper to reset editor and restore focus
		const resetAndFocus = useCallback(() => {
			editor.tf.reset()
			setTimeout(() => {
				editor.tf.select({
					anchor: { path: [0, 0], offset: 0 },
					focus: { path: [0, 0], offset: 0 },
				})
				focusEditor()
			}, 0)
		}, [editor, focusEditor])

		useImperativeHandle(
			ref,
			() => ({
				focusAndInsertText: (text: string) => {
					editor.transforms.insertText(text)
					focusEditor()
				},
				clearContent: resetAndFocus,
			}),
			[editor, focusEditor, resetAndFocus],
		)

		const handleSubmit = async () => {
			if (!onSubmit) return

			const textContent = Node.string(editor)

			await onSubmit(textContent)

			setAttachmentIds?.([])
			actionsRef.current?.cleanup()

			resetAndFocus()
		}

		const handleKeyDown = (event: React.KeyboardEvent) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault()
				handleSubmit()
			}
		}

		const handleEmojiSelect = (emoji: string) => {
			editor.transforms.insertText(emoji)
			focusEditor()
		}

		return (
			<Plate editor={editor} onChange={() => onUpdate?.(Node.string(editor))}>
				<EditorContainer className={cx("relative")}>
					<Editor
						variant="chat"
						className={cx("border border-primary bg-primary", className)}
						renderLeaf={PreviewLeaf}
						placeholder={placeholder}
						onKeyDown={handleKeyDown}
					/>
					{setAttachmentIds && (
						<MessageComposerActions
							ref={actionsRef}
							attachmentIds={attachmentIds}
							setAttachmentIds={setAttachmentIds}
							uploads={uploads}
							onSubmit={handleSubmit}
							onEmojiSelect={handleEmojiSelect}
						/>
					)}
				</EditorContainer>
			</Plate>
		)
	},
)
