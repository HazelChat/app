"use client"

import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId } from "@hazel/schema"
import { Exit, pipe } from "effect"
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react"
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
import { toast } from "sonner"
import { useGlobalKeyboardFocus } from "~/hooks/use-global-keyboard-focus"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { cx } from "~/utils/cx"
import {
	type AutocompleteEditor,
	type AutocompleteState,
	type BotCommandData,
	type CommandInputState,
	CommandTrigger,
	DEFAULT_TRIGGERS,
	EditorAutocomplete,
	type EmojiData,
	EmojiTrigger,
	initialCommandInputState,
	insertAutocompleteResult,
	type MentionData,
	MentionTrigger,
	useBotCommandOptions,
	useBotCommands,
	useEmojiOptions,
	useMentionOptions,
	withAutocomplete,
} from "./autocomplete"
import { CommandInputPanel } from "./autocomplete/command-input-panel"
import { getOptionByIndex, useSlateAutocomplete } from "./autocomplete/use-slate-combobox"
import { CodeBlockElement } from "./code-block-element"
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
import type { MentionElement as MentionElementType } from "./slate-mention-plugin"
import { isCodeBlockElement } from "./types"

// Extend the editor type with autocomplete plugin
type CustomEditor = AutocompleteEditor

export interface SlateMessageEditorRef {
	focusAndInsertText: (text: string) => void
	clearContent: () => void
}

interface SlateMessageEditorProps {
	placeholder?: string
	className?: string
	channelId?: ChannelId
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

// Configure mention elements as inline and void
const withMentionElements = (editor: CustomEditor): CustomEditor => {
	const { isInline, isVoid, markableVoid } = editor

	editor.isInline = (element: any) => {
		return element.type === "mention" ? true : isInline(element)
	}

	editor.isVoid = (element: any) => {
		return element.type === "mention" ? true : isVoid(element)
	}

	editor.markableVoid = (element: any) => {
		return element.type === "mention" || markableVoid(element)
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
				<p {...attributes} className="my-0 min-h-6">
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
			return <CodeBlockElement {...props} element={customElement as any} showControls={false} />
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
	({ placeholder = "Type a message...", className, channelId, onSubmit, onUpdate, isUploading = false }, ref) => {
		const containerRef = useRef<HTMLDivElement>(null)

		// Autocomplete state from Slate plugin
		const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
			isOpen: false,
			trigger: null,
			search: "",
			activeIndex: 0,
			startPoint: null,
			targetRange: null,
		})

		// Command input state (Discord-style argument entry)
		const [commandInputState, setCommandInputState] =
			useState<CommandInputState>(initialCommandInputState)

		// Create Slate editor with plugins
		const editor = useMemo(
			() =>
				pipe(
					createEditor(),
					withHistory,
					withReact,
					(e) => withAutocomplete(e, DEFAULT_TRIGGERS, setAutocompleteState),
					withMentionElements,
					withAutoformat,
				) as CustomEditor,
			[],
		)

		const [value, setValue] = useState<CustomDescendant[]>(createEmptyValue())

		// Get bot commands for this channel
		// TODO: Get actual channelId from context
		const botCommands = useBotCommands("mock-channel-id")

		// Mutation for executing integration commands
		const executeCommand = useAtomSet(HazelApiClient.mutation("integration-commands", "executeCommand"), {
			mode: "promiseExit",
		})

		// Get options for each trigger type
		const mentionOptions = useMentionOptions(autocompleteState)
		const commandOptions = useBotCommandOptions(autocompleteState, botCommands)
		const emojiOptions = useEmojiOptions(autocompleteState)

		// Get current options based on active trigger
		const currentOptions = useMemo(() => {
			if (!autocompleteState.isOpen || !autocompleteState.trigger) return []
			switch (autocompleteState.trigger.id) {
				case "mention":
					return mentionOptions
				case "command":
					return commandOptions
				case "emoji":
					return emojiOptions
				default:
					return []
			}
		}, [
			autocompleteState.isOpen,
			autocompleteState.trigger,
			mentionOptions,
			commandOptions,
			emojiOptions,
		])

		// Helper to close autocomplete
		const closeAutocomplete = useCallback(() => {
			const newState = {
				isOpen: false,
				trigger: null,
				search: "",
				activeIndex: 0,
				startPoint: null,
				targetRange: null,
			} as AutocompleteState
			setAutocompleteState(newState)
			editor.autocompleteState = newState
		}, [editor])

		// Command input handlers (Discord-style argument entry)
		const handleCommandValueChange = useCallback((argName: string, value: string) => {
			setCommandInputState((prev) => ({
				...prev,
				values: { ...prev.values, [argName]: value },
			}))
		}, [])

		const handleCommandFocusField = useCallback((index: number) => {
			setCommandInputState((prev) => ({
				...prev,
				focusedFieldIndex: index,
			}))
		}, [])

		const handleCommandExecute = useCallback(async () => {
			if (!commandInputState.command) return
			if (!channelId) {
				toast.error("Cannot execute command without a channel")
				return
			}

			// Validate required fields
			const missingRequired = commandInputState.command.arguments
				.filter((arg) => arg.required && !commandInputState.values[arg.name])
				.map((arg) => arg.name)

			if (missingRequired.length > 0) {
				toast.error(`Missing required: ${missingRequired.join(", ")}`)
				return
			}

			// Extract provider from command ID (e.g., "linear-issue" -> "linear")
			const provider = commandInputState.command.id.split("-")[0] as
				| "linear"
				| "github"
				| "figma"
				| "notion"

			// Build arguments array
			const args = Object.entries(commandInputState.values)
				.filter(([_, value]) => value.trim() !== "")
				.map(([name, value]) => ({ name, value }))

			const toastId = toast.loading(`Creating ${commandInputState.command.name}...`)

			const exit = await executeCommand({
				path: { provider, commandId: commandInputState.command.id },
				payload: { channelId, arguments: args },
			})

			Exit.match(exit, {
				onSuccess: (result) => {
					toast.dismiss(toastId)

					// Handle Linear issue result
					if ("identifier" in result && "url" in result) {
						toast.success(`Created ${result.identifier}`, {
							action: {
								label: "View",
								onClick: () => window.open(result.url, "_blank"),
							},
						})
					} else {
						toast.success(`Executed /${commandInputState.command?.name}`)
					}

					// Exit input mode and focus editor
					setCommandInputState(initialCommandInputState)
					ReactEditor.focus(editor)
				},
				onFailure: (cause) => {
					toast.dismiss(toastId)

					// Extract error message from cause
					const error = cause._tag === "Fail" ? cause.error : null
					let message = "Command failed"

					if (error && typeof error === "object" && "_tag" in error) {
						switch (error._tag) {
							case "IntegrationNotConnectedForCommandError":
								message = `${provider.charAt(0).toUpperCase() + provider.slice(1)} is not connected`
								break
							case "CommandExecutionError":
								message = (error as { message: string }).message
								break
							case "MissingRequiredArgumentError":
								message = `Missing required: ${(error as { argumentName: string }).argumentName}`
								break
							default:
								message = "Command execution failed"
						}
					}

					toast.error(message)
				},
			})
		}, [commandInputState, executeCommand, editor])

		const handleCommandCancel = useCallback(() => {
			setCommandInputState(initialCommandInputState)
			ReactEditor.focus(editor)
		}, [editor])

		// Handle selection by index - routes to the right handler based on trigger type
		const handleSelectByIndex = useCallback(
			(index: number) => {
				if (!autocompleteState.trigger) return

				switch (autocompleteState.trigger.id) {
					case "mention": {
						const option = getOptionByIndex(mentionOptions, index)
						if (!option) return

						const mention: MentionElementType = {
							type: "mention",
							userId: option.data.type === "user" ? option.data.id : option.data.type,
							displayName: option.data.displayName,
							children: [{ text: "" }],
						}
						insertAutocompleteResult(editor, mention, setAutocompleteState)
						ReactEditor.focus(editor)
						setValue([...value])
						break
					}
					case "command": {
						const option = getOptionByIndex(commandOptions, index)
						if (!option) return

						// Enter command input mode (Discord-style)
						// Clear the editor and show the command input panel
						const { startPoint, targetRange } = editor.autocompleteState
						if (startPoint && targetRange) {
							Transforms.select(editor, { anchor: startPoint, focus: targetRange.focus })
							Transforms.delete(editor)
						}

						// Close autocomplete and enter command input mode
						closeAutocomplete()
						setCommandInputState({
							isActive: true,
							command: option.data,
							values: {},
							focusedFieldIndex: 0,
						})
						break
					}
					case "emoji": {
						const option = getOptionByIndex(emojiOptions, index)
						if (!option) return

						insertAutocompleteResult(editor, option.data.emoji, setAutocompleteState)
						ReactEditor.focus(editor)
						break
					}
				}
			},
			[
				autocompleteState.trigger,
				editor,
				value,
				mentionOptions,
				commandOptions,
				emojiOptions, // Close autocomplete and enter command input mode
				closeAutocomplete,
			],
		)

		// Use the new simplified autocomplete hook
		const autocomplete = useSlateAutocomplete({
			isOpen: autocompleteState.isOpen,
			itemCount: currentOptions.length,
			onSelect: handleSelectByIndex,
			onClose: closeAutocomplete,
		})

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
			// Directly reset the editor's children to force complete state clear
			editor.children = createEmptyValue()
			editor.onChange()

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

			// Handle autocomplete keyboard navigation when open
			if (autocompleteState.isOpen && currentOptions.length > 0) {
				// Let our autocomplete hook handle arrow keys, Enter, Tab, Escape
				if (autocomplete.handleKeyDown(event)) {
					return // Event was handled by autocomplete
				}
			}

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
		useGlobalKeyboardFocus({
			onInsertText: focusAndInsertTextInternal,
		})

		// Custom decorator that handles both markdown and code syntax highlighting
		const decorate = useCallback(
			(entry: [node: any, path: number[]]) => {
				const [node, nodePath] = entry

				// Check if this node is a code-block element
				if (SlateElement.isElement(node) && isCodeBlockElement(node)) {
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
			<div ref={containerRef} className={cx("relative w-full", className)}>
				{/* Command input panel (Discord-style) - replaces editor when active */}
				{commandInputState.isActive && commandInputState.command ? (
					<CommandInputPanel
						command={commandInputState.command}
						values={commandInputState.values}
						focusedFieldIndex={commandInputState.focusedFieldIndex}
						onValueChange={handleCommandValueChange}
						onFocusField={handleCommandFocusField}
						onExecute={handleCommandExecute}
						onCancel={handleCommandCancel}
					/>
				) : (
					<Slate editor={editor} initialValue={value} onChange={handleChange}>
						{/* Autocomplete popover - positioned above the editor */}
						<EditorAutocomplete containerRef={containerRef} state={autocompleteState}>
							{autocompleteState.trigger?.id === "mention" && (
								<MentionTrigger
									items={currentOptions as any}
									activeIndex={autocomplete.activeIndex}
									onSelect={handleSelectByIndex}
									onHover={autocomplete.setActiveIndex}
								/>
							)}
							{autocompleteState.trigger?.id === "command" && (
								<CommandTrigger
									items={currentOptions as any}
									activeIndex={autocomplete.activeIndex}
									onSelect={handleSelectByIndex}
									onHover={autocomplete.setActiveIndex}
								/>
							)}
							{autocompleteState.trigger?.id === "emoji" && (
								<EmojiTrigger
									items={currentOptions as any}
									activeIndex={autocomplete.activeIndex}
									onSelect={handleSelectByIndex}
									onHover={autocomplete.setActiveIndex}
									searchLength={autocompleteState.search.length}
								/>
							)}
						</EditorAutocomplete>

						<Editable
							role="combobox"
							aria-autocomplete="list"
							aria-expanded={autocompleteState.isOpen && currentOptions.length > 0}
							aria-haspopup="listbox"
							onBlur={() => {
								// Close autocomplete when editor loses focus (e.g., clicking outside)
								if (autocompleteState.isOpen) {
									closeAutocomplete()
								}
							}}
							className={cx(
								"w-full whitespace-pre-wrap break-all px-3 py-2 text-base md:text-sm",
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
					</Slate>
				)}
			</div>
		)
	},
)

SlateMessageEditor.displayName = "SlateMessageEditor"
