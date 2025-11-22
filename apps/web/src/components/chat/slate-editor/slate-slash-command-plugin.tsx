import { Editor, Element as SlateElement, Point, Range, Transforms } from "slate"
import type { BaseEditor } from "slate"
import type { HistoryEditor } from "slate-history"
import type { ReactEditor } from "slate-react"

// Extend the editor type
type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

export interface SlashCommandState {
	active: boolean
	search: string
	start: Point | null
	target: Range | null
}

// Add slash command state to editor
export interface SlashCommandEditor extends CustomEditor {
	slashCommandState: SlashCommandState
}

/**
 * Plugin to add /command functionality to Slate editor
 * Detects / character at the start of a block and tracks state for autocomplete
 */
export const withSlashCommands = <T extends Editor>(editor: T): T & SlashCommandEditor => {
	const { insertText, deleteBackward, insertBreak } = editor
	const slashCommandEditor = editor as T & SlashCommandEditor

	// Initialize slash command state
	slashCommandEditor.slashCommandState = {
		active: false,
		search: "",
		start: null,
		target: null,
	}

	// Override insertText to detect / and track search text
	slashCommandEditor.insertText = (text: string) => {
		const { selection } = slashCommandEditor

		if (text === "/" && selection && Range.isCollapsed(selection)) {
			// Check if / is at start of the block
			const { anchor } = selection
			const block = Editor.above(slashCommandEditor, {
				match: (n) => SlateElement.isElement(n) && Editor.isBlock(slashCommandEditor, n),
			})

			if (block) {
				const [_, path] = block
				const startOfBlock = Editor.start(slashCommandEditor, path)
				const isAtStart = Point.equals(anchor, startOfBlock)

				// Start slash command only if at start of block
				if (isAtStart) {
					slashCommandEditor.slashCommandState = {
						active: true,
						search: "",
						start: anchor,
						target: { anchor, focus: anchor },
					}
				}
			}
		} else if (slashCommandEditor.slashCommandState.active && selection && Range.isCollapsed(selection)) {
			// Update search text
			const { start } = slashCommandEditor.slashCommandState

			if (start) {
				const after = Editor.after(slashCommandEditor, selection.anchor, { unit: "character" })
				const afterPoint = after || selection.anchor

				// Check if we're still in the command range
				const range = Editor.range(slashCommandEditor, start, afterPoint)
				const searchText = Editor.string(slashCommandEditor, range)

				// Cancel command on whitespace (commands usually don't have spaces)
				if (/\s/.test(text)) {
					slashCommandEditor.slashCommandState = {
						active: false,
						search: "",
						start: null,
						target: null,
					}
				} else {
					// Update search text (remove the / prefix)
					const newSearch = (searchText + text).replace(/^\//, "")

					slashCommandEditor.slashCommandState = {
						...slashCommandEditor.slashCommandState,
						search: newSearch,
						target: { anchor: start, focus: afterPoint },
					}
				}
			}
		}

		insertText(text)
	}

	// Override deleteBackward to update slash command state
	slashCommandEditor.deleteBackward = (...args) => {
		const { selection, slashCommandState } = slashCommandEditor

		if (
			slashCommandState.active &&
			selection &&
			Range.isCollapsed(selection) &&
			slashCommandState.start
		) {
			// Check if we're deleting past the / symbol
			const { anchor } = selection
			const isAtStart = Point.equals(anchor, slashCommandState.start)

			if (isAtStart) {
				// Cancel slash command
				slashCommandEditor.slashCommandState = {
					active: false,
					search: "",
					start: null,
					target: null,
				}
			} else {
				// Update search text
				const newSearch = slashCommandState.search.slice(0, -1)

				slashCommandEditor.slashCommandState = {
					...slashCommandState,
					search: newSearch,
					target: slashCommandState.target
						? {
								...slashCommandState.target,
								focus:
									Editor.before(slashCommandEditor, slashCommandState.target.focus, {
										unit: "character",
									}) || slashCommandState.target.focus,
							}
						: null,
				}
			}
		}

		deleteBackward(...args)
	}

	// Override insertBreak to cancel slash command on Enter
	slashCommandEditor.insertBreak = () => {
		if (slashCommandEditor.slashCommandState.active) {
			// Cancel slash command
			slashCommandEditor.slashCommandState = {
				active: false,
				search: "",
				start: null,
				target: null,
			}
		}

		insertBreak()
	}

	return slashCommandEditor
}

/**
 * Execute a slash command
 * Called when user selects a command from the autocomplete
 */
export function executeSlashCommand(
	editor: SlashCommandEditor,
	command: { id: string; type: string; value?: string; label: string },
	onAction?: (commandId: string) => void,
) {
	const { slashCommandState } = editor
	const { target, start } = slashCommandState

	if (!target || !start) return

	// Delete the / and search text
	const range = {
		anchor: start,
		focus: target.focus,
	}

	Transforms.select(editor, range)
	Transforms.delete(editor)

	// Handle different command types
	if (command.type === "text" && command.value) {
		Editor.insertText(editor, command.value)
	} else if (command.type === "action" && onAction) {
		onAction(command.id)
	}

	// Reset state
	editor.slashCommandState = {
		active: false,
		search: "",
		start: null,
		target: null,
	}
}
