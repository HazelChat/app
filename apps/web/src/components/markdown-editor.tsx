"use client"

import { Plate, usePlateEditor } from "platejs/react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react"
import { Node } from "slate"
import { Editor, EditorContainer } from "~/components/editor/editor-ui/editor"
import { BasicNodesKit } from "~/components/editor/plugins/basic-nodes-kit"
import { cx } from "~/utils/cx"
import { MessageComposerActions } from "./chat/message-composer-actions"
import { AutoformatKit } from "./editor/plugins/autoformat-kit"
import { CodeBlockKit } from "./editor/plugins/code-block-kit"
import { ExitBreakKit } from "./editor/plugins/exit-break-kit"
import { MarkdownKit } from "./editor/plugins/markdown-kit"
import { MentionKit } from "./editor/plugins/mention-kit"
import { SlashKit } from "./editor/plugins/slash-kit"

export interface MarkdownEditorRef {
	focusAndInsertText: (text: string) => void
	clearContent: () => void
}

interface MarkdownEditorProps {
	placeholder?: string
	className?: string
	onSubmit?: (content: string) => void | Promise<void>
	onUpdate?: (content: string) => void
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
	({ placeholder = "Type a message...", className, onSubmit, onUpdate }, ref) => {
		const actionsRef = useRef<{ cleanup: () => void } | null>(null)

		const editor = usePlateEditor(
			{
				plugins: [
					...BasicNodesKit,
					...MarkdownKit,
					...ExitBreakKit,
					...AutoformatKit,
					...SlashKit,
					...CodeBlockKit,
					...MentionKit,
				],
			},
			[],
		)

		const focusEditor = useCallback(() => {
			requestAnimationFrame(() => {
				// Don't steal focus if a modal is open and focused
				const dialog = document.querySelector('[role="dialog"]')
				const activeElement = document.activeElement
				if (dialog && activeElement && dialog.contains(activeElement)) return

				editor.tf.focus({
					edge: "end",
				})
			})
		}, [editor])

		const focusAndInsertTextInternal = useCallback(
			(text: string) => {
				// Use requestAnimationFrame to ensure DOM is ready
				requestAnimationFrame(() => {
					// Don't steal focus if a modal is open and focused
					const dialog = document.querySelector('[role="dialog"]')
					const activeElement = document.activeElement
					if (dialog && activeElement && dialog.contains(activeElement)) return

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
				// Don't steal focus if a modal is open and focused
				const dialog = document.querySelector('[role="dialog"]')
				const activeElement = document.activeElement
				if (dialog && activeElement && dialog.contains(activeElement)) return

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

		useEffect(() => {
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

				if (document.querySelector('[role="dialog"]')) return

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
		}, [focusAndInsertTextInternal])

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
					<MessageComposerActions
						ref={actionsRef}
						onSubmit={handleSubmit}
						onEmojiSelect={handleEmojiSelect}
					/>
				</EditorContainer>
			</Plate>
		)
	},
)
