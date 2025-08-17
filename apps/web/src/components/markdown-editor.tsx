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

	const tokens = Prism.tokenize(node.text, Prism.languages.markdown)
	let start = 0

	for (const token of tokens) {
		const length = getLength(token)
		const end = start + length

		if (typeof token !== "string") {
			ranges.push({
				anchor: { offset: start, path },
				focus: { offset: end, path },
				[token.type]: true,
			})
		}

		start = end
	}

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
		hr?: boolean
		italic?: boolean
		list?: boolean
		title?: boolean
	} & TText
>) {
	const { blockquote, bold, code, hr, italic, list, title } = leaf

	return (
		<span
			{...attributes}
			className={cn(
				bold && "font-bold",
				italic && "italic",
				title && "mx-0 mt-5 mb-2.5 inline-block font-bold text-[20px]",
				list && "pl-2.5 text-[20px] leading-[10px]",
				hr && "block border-[#ddd] border-b-2 text-center",
				blockquote && "inline-block border-[#ddd] border-l-2 pl-2.5 text-[#aaa] italic",
				code && "bg-[#eee] p-[3px] font-mono",
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
	onSubmit?: (content: string, jsonContent: any) => void | Promise<void>
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
			const jsonContent = editor.children
			await onSubmit(textContent, jsonContent)

			// Clear attachments and cleanup
			setAttachmentIds?.([])
			actionsRef.current?.cleanup()

			// Reset editor and refocus
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
				<EditorContainer className={cn("relative", className)}>
					<Editor
						variant="chat"
						className="border border-primary bg-primary pr-[120px]"
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
