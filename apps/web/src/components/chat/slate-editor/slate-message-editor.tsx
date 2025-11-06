"use client"

import { pipe } from "effect"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"
import type { Descendant } from "slate"
import { createEditor, Editor, Range, Element as SlateElement, Transforms } from "slate"
import { withHistory } from "slate-history"
import {
	Editable,
	ReactEditor,
	type RenderElementProps,
	type RenderLeafProps,
	Slate,
	withReact,
} from "slate-react"
import { cx } from "~/utils/cx"
import { CodeBlockElement } from "./code-block-element"
import { MentionAutocomplete } from "./mention-autocomplete"
import { MentionElement } from "./mention-element"
import { MentionLeaf } from "./mention-leaf"
import { decorateCodeBlock } from "./slate-code-decorator"
import { decorateMarkdown } from "./slate-markdown-decorators"
import {
	type CustomDescendant,
	type CustomElement,
	createEmptyValue,
	isValueEmpty,
	serializeToMarkdown,
} from "./slate-markdown-serializer"
import { insertMention, type MentionEditor, withMentions } from "./slate-mention-plugin"

// Extend the editor type with all plugins
type CustomEditor = MentionEditor

export interface SlateMessageEditorRef {
	focusAndInsertText: (text: string) => void
	clearContent: () => void
}

interface SlateMessageEditorProps {
	placeholder?: string
	className?: string
	onSubmit?: (content: string) => void | Promise<void>
	onUpdate?: (content: string) => void
	isUploading?: boolean
}

// Autoformat plugin to convert markdown shortcuts to block types
const withAutoformat = (editor: CustomEditor): CustomEditor => {
	const { insertText, insertBreak } = editor

	editor.insertText = (text) => {
		const { selection } = editor

		if (text === " " && selection && Range.isCollapsed(selection)) {
			const { anchor } = selection
			const block = Editor.above(editor, {
				match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
			})

			if (block) {
				const [_node, path] = block
				const start = Editor.start(editor, path)
				const range = { anchor, focus: start }
				const beforeText = Editor.string(editor, range)

				// Check for blockquote patterns
				if (beforeText === ">") {
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, { type: "blockquote" } as Partial<CustomElement>)
					return
				}

				if (beforeText === ">>>") {
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, { type: "blockquote" } as Partial<CustomElement>)
					return
				}

				// Check for code block pattern
				if (beforeText === "```") {
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, {
						type: "code-block",
						language: undefined,
					} as Partial<CustomElement>)
					return
				}

				// Check for code block with language (e.g., ```js)
				const codeBlockMatch = beforeText.match(/^```(\w+)$/)
				if (codeBlockMatch) {
					const language = codeBlockMatch[1]
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, {
						type: "code-block",
						language,
					} as Partial<CustomElement>)
					return
				}

				// Check for subtext pattern (-#)
				if (beforeText === "-#") {
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, { type: "subtext" } as Partial<CustomElement>)
					return
				}

				// Check for unordered list pattern (- or *)
				if (beforeText === "-" || beforeText === "*") {
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, {
						type: "list-item",
						ordered: false,
					} as Partial<CustomElement>)
					return
				}

				// Check for ordered list pattern (1. 2. etc)
				const orderedListMatch = beforeText.match(/^(\d+)\.$/)
				if (orderedListMatch) {
					Transforms.select(editor, range)
					Transforms.delete(editor)
					Transforms.setNodes(editor, {
						type: "list-item",
						ordered: true,
					} as Partial<CustomElement>)
					return
				}
			}
		}

		insertText(text)
	}

	editor.insertBreak = () => {
		const { selection } = editor

		if (selection) {
			const block = Editor.above(editor, {
				match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
			})

			if (block) {
				const [node] = block
				const element = node as CustomElement

				// In code blocks, Enter inserts a newline
				if (element.type === "code-block") {
					Editor.insertText(editor, "\n")
					return
				}
			}
		}

		insertBreak()
	}

	return editor
}

// Define custom element renderer
const Element = (props: RenderElementProps) => {
	const { attributes, children, element } = props
	const customElement = element as CustomElement

	switch (customElement.type) {
		case "mention":
			return <MentionElement {...props} element={customElement as any} interactive={false} />
		case "paragraph":
			return (
				<p {...attributes} className="my-0">
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
			return <CodeBlockElement {...props} showControls={false} />
		case "subtext":
			return (
				<p {...attributes} className="my-0 text-muted-fg text-xs">
					{children}
				</p>
			)
		case "list-item":
			return (
				<li {...attributes} className="my-0.5 ml-4">
					{children}
				</li>
			)
		default:
			return <p {...attributes}>{children}</p>
	}
}

// Define custom leaf renderer with markdown highlighting and mention display
const Leaf = (props: RenderLeafProps) => {
	return <MentionLeaf {...props} interactive={false} mode="composer" />
}

// Check if placeholder should be hidden based on element types
// Placeholder should hide when there are blockquotes or code blocks (even if empty)
const shouldHidePlaceholder = (value: CustomDescendant[]): boolean => {
	return value.some((node) => {
		if ("type" in node) {
			const element = node as CustomElement
			return element.type === "blockquote" || element.type === "code-block"
		}
		return false
	})
}

export const SlateMessageEditor = forwardRef<SlateMessageEditorRef, SlateMessageEditorProps>(
	({ placeholder = "Type a message...", className, onSubmit, onUpdate, isUploading = false }, ref) => {
		// Create Slate editor with React, History, Autoformat, and Mentions plugins
		const editor = useMemo(
			() => pipe(createEditor(), withHistory, withReact, withMentions, withAutoformat) as CustomEditor,
			[],
		)

		const [value, setValue] = useState<CustomDescendant[]>(createEmptyValue())
		const focusAndInsertTextInternal = useCallback(
			(text: string) => {
				requestAnimationFrame(() => {
					const dialog = document.querySelector('[role="dialog"]')
					const activeElement = document.activeElement
					if (dialog && activeElement && dialog.contains(activeElement)) {
						return
					}

					// Focus at end
					ReactEditor.focus(editor)
					Transforms.select(editor, Editor.end(editor, []))

					requestAnimationFrame(() => {
						Editor.insertText(editor, text)
					})
				})
			},
			[editor],
		)

		// Clear content and focus
		const resetAndFocus = useCallback(() => {
			// Reset the editor
			Transforms.delete(editor, {
				at: {
					anchor: Editor.start(editor, []),
					focus: Editor.end(editor, []),
				},
			})

			// Set the value to empty (this updates React state)
			setValue(createEmptyValue())

			setTimeout(() => {
				const dialog = document.querySelector('[role="dialog"]')
				const activeElement = document.activeElement
				if (dialog && activeElement && dialog.contains(activeElement)) return

				ReactEditor.focus(editor)
				Transforms.select(editor, Editor.start(editor, []))
			}, 0)
		}, [editor])

		// Expose imperative API
		useImperativeHandle(
			ref,
			() => ({
				focusAndInsertText: focusAndInsertTextInternal,
				clearContent: resetAndFocus,
			}),
			[focusAndInsertTextInternal, resetAndFocus],
		)

		// Handle submit
		const handleSubmit = async () => {
			if (!onSubmit) return
			if (isUploading) return

			const textContent = serializeToMarkdown(value).trim()

			if (!textContent || textContent.length === 0 || isValueEmpty(value)) return

			await onSubmit(textContent)

			resetAndFocus()
		}

		// Handle key down
		const handleKeyDown = (event: React.KeyboardEvent) => {
			const { selection } = editor

			// Handle Command+A / Ctrl+A for select all
			if ((event.metaKey || event.ctrlKey) && event.key === "a") {
				if (!selection) return

				// Get the current block
				const block = Editor.above(editor, {
					match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
				})

				if (block) {
					const [node, path] = block
					const element = node as CustomElement

					// For code blocks and blockquotes, select all content within the block
					if (element.type === "code-block" || element.type === "blockquote") {
						event.preventDefault()
						Transforms.select(editor, {
							anchor: Editor.start(editor, path),
							focus: Editor.end(editor, path),
						})
						return
					}
				}

				// For paragraphs or other blocks, select entire editor content
				event.preventDefault()
				Transforms.select(editor, {
					anchor: Editor.start(editor, []),
					focus: Editor.end(editor, []),
				})
				return
			}

			// Handle Backspace at start of blockquote (convert to paragraph)
			if (event.key === "Backspace" && selection && Range.isCollapsed(selection)) {
				const block = Editor.above(editor, {
					match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
				})

				if (block) {
					const [node, path] = block
					const element = node as CustomElement

					// In blockquotes, if cursor is at the very start, convert to paragraph
					if (element.type === "blockquote") {
						const isAtStart = Editor.isStart(editor, selection.anchor, path)

						if (isAtStart) {
							event.preventDefault()
							Transforms.setNodes(editor, { type: "paragraph" } as Partial<CustomElement>, {
								at: path,
							})
							return
						}
					}

					// Same for code blocks
					if (element.type === "code-block") {
						const isAtStart = Editor.isStart(editor, selection.anchor, path)

						if (isAtStart) {
							event.preventDefault()
							Transforms.setNodes(editor, { type: "paragraph" } as Partial<CustomElement>, {
								at: path,
							})
							return
						}
					}

					// Same for list items and subtext
					if (element.type === "list-item" || element.type === "subtext") {
						const isAtStart = Editor.isStart(editor, selection.anchor, path)

						if (isAtStart) {
							event.preventDefault()
							Transforms.setNodes(editor, { type: "paragraph" } as Partial<CustomElement>, {
								at: path,
							})
							return
						}
					}
				}
			}

			// Handle ArrowDown at end of code block or blockquote - exit to paragraph below
			if (event.key === "ArrowDown" && selection && Range.isCollapsed(selection)) {
				const block = Editor.above(editor, {
					match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
				})

				if (block) {
					const [node, path] = block
					const element = node as CustomElement

					if (element.type === "code-block" || element.type === "blockquote") {
						const isAtEnd = Editor.isEnd(editor, selection.anchor, path)

						if (isAtEnd && typeof path[0] === "number") {
							event.preventDefault()

							const nextPath = path[0] + 1

							// Insert new paragraph after the block
							Transforms.insertNodes(
								editor,
								{
									type: "paragraph",
									children: [{ text: "" }],
								} as CustomElement,
								{ at: [nextPath] },
							)

							// Move cursor to the new paragraph
							Transforms.select(editor, {
								anchor: { path: [nextPath, 0], offset: 0 },
								focus: { path: [nextPath, 0], offset: 0 },
							})
							return
						}
					}
				}
			}

			// Handle ArrowUp at start of code block or blockquote - exit to paragraph above
			if (event.key === "ArrowUp" && selection && Range.isCollapsed(selection)) {
				const block = Editor.above(editor, {
					match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
				})

				if (block) {
					const [node, path] = block
					const element = node as CustomElement

					if (element.type === "code-block" || element.type === "blockquote") {
						const isAtStart = Editor.isStart(editor, selection.anchor, path)

						if (isAtStart && typeof path[0] === "number") {
							event.preventDefault()

							// Insert new paragraph before the block
							Transforms.insertNodes(
								editor,
								{
									type: "paragraph",
									children: [{ text: "" }],
								} as CustomElement,
								{ at: path },
							)

							// Move cursor to the new paragraph (which is now at the current path)
							Transforms.select(editor, {
								anchor: { path: [path[0], 0], offset: 0 },
								focus: { path: [path[0], 0], offset: 0 },
							})
							return
						}
					}
				}
			}

			// Handle Shift+Enter in code blocks and blockquotes
			if (event.key === "Enter" && event.shiftKey && selection) {
				const block = Editor.above(editor, {
					match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
				})

				if (block) {
					const [node, path] = block
					const element = node as CustomElement

					// In code blocks, Shift+Enter also inserts a newline (same as Enter)
					if (element.type === "code-block") {
						event.preventDefault()
						Editor.insertText(editor, "\n")
						return
					}

					// In blockquotes, Shift+Enter behavior:
					// - If current line is empty, break out to paragraph
					// - Otherwise, insert a newline to continue the blockquote
					if (element.type === "blockquote") {
						event.preventDefault()

						// Get text before cursor on current line
						const lineStart = Editor.before(editor, selection.anchor, { unit: "line" })
						const beforeRange = {
							anchor: lineStart || Editor.start(editor, path),
							focus: selection.anchor,
						}
						const beforeText = Editor.string(editor, beforeRange)

						// Get text after cursor on current line
						const lineEnd = Editor.after(editor, selection.anchor, { unit: "line" })
						const afterRange = {
							anchor: selection.anchor,
							focus: lineEnd || Editor.end(editor, path),
						}
						const afterText = Editor.string(editor, afterRange)

						// Check if current line is empty (only whitespace before and after cursor)
						const isCurrentLineEmpty = beforeText.trim() === "" && afterText.trim() === ""

						if (isCurrentLineEmpty && typeof path[0] === "number") {
							// Break out of blockquote - insert paragraph below and move cursor there
							const nextPath = path[0] + 1

							Transforms.insertNodes(
								editor,
								{
									type: "paragraph",
									children: [{ text: "" }],
								} as CustomElement,
								{ at: [nextPath] },
							)

							Transforms.select(editor, {
								anchor: { path: [nextPath, 0], offset: 0 },
								focus: { path: [nextPath, 0], offset: 0 },
							})
						} else {
							// Continue blockquote - insert newline
							Editor.insertText(editor, "\n")
						}

						return
					}
				}
			}

			// Handle Enter (without Shift) - submit from paragraphs and blockquotes
			if (event.key === "Enter" && !event.shiftKey) {
				const block = Editor.above(editor, {
					match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
				})

				if (block) {
					const [node, path] = block
					const element = node as CustomElement

					// In code blocks, Enter inserts a newline (handled by autoformat plugin)
					// Exception: if completely empty, convert to paragraph
					if (element.type === "code-block") {
						const blockText = Editor.string(editor, path)

						if (blockText.trim() === "") {
							event.preventDefault()
							Transforms.setNodes(editor, { type: "paragraph" } as Partial<CustomElement>, {
								at: path,
							})
							return
						}

						// Otherwise, let the autoformat plugin's insertBreak handle it (inserts \n)
						// Don't preventDefault here - allow the insertBreak to run
						return
					}

					// Submit from paragraphs, blockquotes, lists, and subtext
					if (
						element.type === "paragraph" ||
						element.type === "blockquote" ||
						element.type === "list-item" ||
						element.type === "subtext"
					) {
						event.preventDefault()
						if (!isUploading) {
							handleSubmit()
						}
						return
					}
				}

				// Default: prevent submission
				event.preventDefault()
			}
		}

		// Handle value changes
		const handleChange = (newValue: Descendant[]) => {
			setValue(newValue as CustomDescendant[])

			if (onUpdate) {
				const text = serializeToMarkdown(newValue as CustomDescendant[])
				onUpdate(text)
			}
		}

		// Global keydown listener to focus editor on typing
		useEffect(() => {
			const handleGlobalKeyDown = (event: KeyboardEvent) => {
				const target = event.target as HTMLElement

				// Check if there's an actually visible/open dialog
				const hasDialog = !!document.querySelector(
					'[role="dialog"]:not([data-react-aria-hidden="true"] *)',
				)

				if (
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.contentEditable === "true"
				) {
					return
				}

				if (hasDialog) {
					return
				}

				if (event.ctrlKey || event.altKey || event.metaKey) {
					return
				}

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
			<div className={cx("relative w-full", className)}>
				<Slate editor={editor} initialValue={value} onChange={handleChange}>
					<Editable
						className={cx(
							"w-full overflow-y-auto px-3 py-2 text-base md:text-sm",
							"rounded-xl bg-transparent",
							"focus:border-primary focus:outline-hidden",
							"caret-primary",
							"placeholder:text-muted-fg",
							"min-h-10",
							"leading-normal",
							"**:data-slate-placeholder:top-2!",
							"**:data-slate-placeholder:translate-y-0!",
						)}
						placeholder={placeholder}
						renderElement={Element}
						renderLeaf={Leaf}
						decorate={decorate}
						onKeyDown={handleKeyDown}
						renderPlaceholder={({ attributes, children }) => {
							// Don't render placeholder if there are blockquotes or code blocks
							if (shouldHidePlaceholder(value)) {
								// biome-ignore lint: Slate's type definition requires React.Element
								return <></>
							}

							return <span {...attributes}>{children}</span>
						}}
					/>

					{/* Render mention autocomplete when active */}
					{editor.mentionState.active && (
						<MentionAutocomplete
							editor={editor}
							search={editor.mentionState.search}
							onSelect={(id, displayName, type) => {
								insertMention(editor, id, displayName, type)
								// Restore focus to the editor
								ReactEditor.focus(editor)
								// Force re-render after mention selection
								setValue([...value])
							}}
						/>
					)}
				</Slate>
			</div>
		)
	},
)

SlateMessageEditor.displayName = "SlateMessageEditor"
