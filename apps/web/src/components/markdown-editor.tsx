"use client"

import type { Id } from "@hazel/backend"
import { Plate, usePlateEditor } from "platejs/react"
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react"
import { Node } from "slate"
import { BasicNodesKit } from "~/components/editor/plugins/basic-nodes-kit"
import { Editor, EditorContainer } from "~/components/editor-ui/editor"
import { cx } from "~/utils/cx"
import { MessageComposerActions } from "./chat/message-composer-actions"
import { AutoformatKit } from "./editor/plugins/autoformat-kit"
import { MarkdownKit } from "./editor/plugins/markdown-kit"
import { MentionKit } from "./editor/plugins/mention-kit"

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
					...AutoformatKit,
					// ...CodeBlockKit,
					...MentionKit,
				],
			},
			[],
		)

		const focusEditor = useCallback(() => {
			editor.tf.focus({
				edge: "end",
			})
		}, [editor])

		const resetAndFocus = useCallback(() => {
			editor.tf.reset()
			setTimeout(() => {
				editor.tf.focus({
					at: {
						anchor: { path: [0, 0], offset: 0 },
						focus: { path: [0, 0], offset: 0 },
					},
				})
			}, 0)
		}, [editor])

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

			const textContent = editor.api.markdown.serialize().trim()

			function isEffectivelyEmpty(str: string) {
				if (!str) return true // null, undefined, or ""
				// Remove normal whitespace + zero-width + non-breaking spaces
				const cleaned = str.replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, "")
				return cleaned.length === 0
			}

			if (!textContent || textContent.length === 0 || isEffectivelyEmpty(textContent)) return

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
				<EditorContainer
					className={cx(
						"relative flex h-max flex-col rounded-xl bg-secondary inset-ring inset-ring-secondary",
						className,
					)}
				>
					<Editor
						variant="chat"
						className="rounded-xl bg-transparent"
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
