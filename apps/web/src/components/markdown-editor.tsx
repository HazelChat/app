"use client"

import type { Id } from "@hazel/backend"
import { Plate, usePlateEditor } from "platejs/react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react"
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
	enableGlobalKeyCapture?: boolean
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
			enableGlobalKeyCapture = false,
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
			requestAnimationFrame(() => {
				editor.tf.focus({
					edge: "end",
				})
			})
		}, [editor])

		const focusAndInsertTextInternal = useCallback(
			(text: string) => {
				// Use requestAnimationFrame to ensure DOM is ready
				requestAnimationFrame(() => {
					// First focus the editor
					editor.tf.focus()

					// Then insert the text at the current cursor position
					requestAnimationFrame(() => {
						editor.transforms.insertText(text)
					})
				})
			},
			[editor],
		)

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
				focusAndInsertText: focusAndInsertTextInternal,
				clearContent: resetAndFocus,
			}),
			[focusAndInsertTextInternal, resetAndFocus],
		)

		// Global keydown listener for capturing keys when editor is not focused
		useEffect(() => {
			if (!enableGlobalKeyCapture) return

			const handleGlobalKeyDown = (event: KeyboardEvent) => {
				// Skip if target is an input, textarea, or contenteditable element
				const target = event.target as HTMLElement
				if (
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.contentEditable === "true"
				) {
					return
				}

				// Skip if user is pressing modifier keys
				if (event.ctrlKey || event.altKey || event.metaKey) {
					return
				}

				// Check if it's a printable character or space
				const isPrintableChar = event.key.length === 1

				if (isPrintableChar) {
					event.preventDefault()
					focusAndInsertTextInternal(event.key)
				}
			}

			document.addEventListener("keydown", handleGlobalKeyDown)

			return () => {
				document.removeEventListener("keydown", handleGlobalKeyDown)
			}
		}, [enableGlobalKeyCapture, focusAndInsertTextInternal])

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
						"relative inset-ring inset-ring-secondary flex h-max flex-col rounded-xl bg-secondary",
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
