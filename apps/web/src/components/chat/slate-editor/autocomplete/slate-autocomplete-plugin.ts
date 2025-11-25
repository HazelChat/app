import type { BaseEditor } from "slate"
import { Editor, Point, Range, Element as SlateElement, Transforms } from "slate"
import type { HistoryEditor } from "slate-history"
import type { ReactEditor } from "slate-react"
import type { AutocompleteState, AutocompleteTrigger } from "./types"
import { initialAutocompleteState } from "./types"

type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

export interface AutocompleteEditor extends CustomEditor {
	autocompleteState: AutocompleteState
	autocompleteTriggers: Map<string, AutocompleteTrigger>
}

/**
 * Default trigger configurations
 */
export const DEFAULT_TRIGGERS: AutocompleteTrigger[] = [
	{
		id: "mention",
		char: "@",
		requireStartOfLine: false,
		cancelChars: [" ", "\n"],
		minSearchLength: 0,
	},
	{
		id: "command",
		char: "/",
		requireStartOfLine: true,
		cancelChars: [" ", "\n"],
		minSearchLength: 0,
	},
	{
		id: "emoji",
		char: ":",
		requireStartOfLine: false,
		cancelChars: [" ", "\n", ":"],
		minSearchLength: 2,
	},
]

/**
 * Check if a trigger's conditions are met at the current position
 */
function checkTriggerConditions(editor: Editor, trigger: AutocompleteTrigger, selection: Range): boolean {
	const { anchor } = selection

	if (trigger.requireStartOfLine) {
		// Check if we're at the start of the line/block
		const block = Editor.above(editor, {
			match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
		})

		if (block) {
			const [, path] = block
			const start = Editor.start(editor, path)
			const beforeRange = { anchor: start, focus: anchor }
			const beforeText = Editor.string(editor, beforeRange)

			// Only allow trigger at start of line or after only whitespace
			if (beforeText.length > 0 && !/^\s*$/.test(beforeText)) {
				return false
			}
		}
	} else {
		// For non-start triggers (like @), check for whitespace/punctuation before
		const before = Editor.before(editor, anchor, { unit: "character" })
		if (before) {
			const beforeChar = Editor.string(editor, { anchor: before, focus: anchor })
			if (beforeChar && !/[\s"'([{]/.test(beforeChar)) {
				return false
			}
		}
	}

	return true
}

/**
 * Plugin to add generic autocomplete functionality to Slate editor
 * Supports multiple trigger characters (@, /, :, etc.)
 */
export function withAutocomplete<T extends CustomEditor>(
	editor: T,
	triggers: AutocompleteTrigger[] = DEFAULT_TRIGGERS,
	onStateChange?: (state: AutocompleteState) => void,
): T & AutocompleteEditor {
	const { insertText, deleteBackward, insertBreak } = editor
	const autocompleteEditor = editor as T & AutocompleteEditor

	// Initialize state
	autocompleteEditor.autocompleteState = { ...initialAutocompleteState }

	// Build trigger map: char -> trigger config
	autocompleteEditor.autocompleteTriggers = new Map(triggers.map((t) => [t.char, t]))

	// Helper to update state and notify React
	const updateState = (newState: AutocompleteState) => {
		autocompleteEditor.autocompleteState = newState
		onStateChange?.(newState)
	}

	// Override insertText to detect triggers and track search text
	autocompleteEditor.insertText = (text: string) => {
		const { selection } = autocompleteEditor
		const { autocompleteState } = autocompleteEditor

		// Check if typed character is a trigger
		const trigger = autocompleteEditor.autocompleteTriggers.get(text)

		if (trigger && selection && Range.isCollapsed(selection)) {
			const canActivate = checkTriggerConditions(autocompleteEditor, trigger, selection)

			if (canActivate) {
				// Save position BEFORE inserting trigger (so we can delete it later)
				const triggerStart = selection.anchor

				// Insert the trigger character
				insertText(text)

				// Then activate autocomplete
				const newSelection = autocompleteEditor.selection
				if (newSelection && Range.isCollapsed(newSelection)) {
					updateState({
						isOpen: true,
						trigger,
						search: "",
						activeIndex: 0,
						startPoint: triggerStart,
						targetRange: { anchor: triggerStart, focus: newSelection.anchor },
					})
				}
				return
			}
		}

		// If autocomplete is active, update search
		if (
			autocompleteState.isOpen &&
			autocompleteState.trigger &&
			selection &&
			Range.isCollapsed(selection)
		) {
			const cancelChars = autocompleteState.trigger.cancelChars ?? [" ", "\n"]

			// Check for cancel characters
			if (cancelChars.includes(text)) {
				// Special case for emoji: if typing ":", it completes the emoji
				// This is handled by the trigger component, so we just close here
				updateState({ ...initialAutocompleteState })
				insertText(text)
				return
			}

			// Update search text
			const newSearch = autocompleteState.search + text
			insertText(text)

			const newSelection = autocompleteEditor.selection
			if (newSelection && autocompleteState.startPoint) {
				updateState({
					...autocompleteState,
					search: newSearch,
					targetRange: {
						anchor: autocompleteState.startPoint,
						focus: newSelection.anchor,
					},
				})
			}
			return
		}

		insertText(text)
	}

	// Override deleteBackward to update autocomplete state
	autocompleteEditor.deleteBackward = (...args) => {
		const { autocompleteState } = autocompleteEditor
		const { selection } = autocompleteEditor

		if (
			autocompleteState.isOpen &&
			selection &&
			Range.isCollapsed(selection) &&
			autocompleteState.startPoint
		) {
			// Check if we're deleting past the trigger character
			const isAtTrigger = Point.equals(selection.anchor, autocompleteState.startPoint)

			if (isAtTrigger || autocompleteState.search.length === 0) {
				// Cancel autocomplete
				updateState({ ...initialAutocompleteState })
			} else {
				// Update search text
				const newSearch = autocompleteState.search.slice(0, -1)
				deleteBackward(...args)

				const newSelection = autocompleteEditor.selection
				if (newSelection && autocompleteState.startPoint) {
					updateState({
						...autocompleteState,
						search: newSearch,
						activeIndex: 0,
						targetRange: {
							anchor: autocompleteState.startPoint,
							focus: newSelection.anchor,
						},
					})
				}
				return
			}
		}

		deleteBackward(...args)
	}

	// Override insertBreak to cancel autocomplete on Enter
	autocompleteEditor.insertBreak = () => {
		if (autocompleteEditor.autocompleteState.isOpen) {
			updateState({ ...initialAutocompleteState })
		}
		insertBreak()
	}

	return autocompleteEditor
}

/**
 * Insert content at the autocomplete trigger position and close autocomplete
 * Used by trigger components to insert their results (mentions, emojis, etc.)
 */
export function insertAutocompleteResult(
	editor: AutocompleteEditor,
	content: any, // Node or text to insert
	onStateChange?: (state: AutocompleteState) => void,
) {
	const { autocompleteState } = editor
	const { startPoint, targetRange } = autocompleteState

	if (!startPoint || !targetRange) return

	// Select the trigger + search text range
	Transforms.select(editor, {
		anchor: startPoint,
		focus: targetRange.focus,
	})

	// Delete trigger + search
	Transforms.delete(editor)

	// Insert the result
	if (typeof content === "string") {
		Transforms.insertText(editor, content)
	} else {
		Transforms.insertNodes(editor, content)
		Transforms.move(editor)
	}

	// Reset state
	const newState = { ...initialAutocompleteState }
	editor.autocompleteState = newState
	onStateChange?.(newState)
}

/**
 * Cancel autocomplete without inserting anything
 */
export function cancelAutocomplete(
	editor: AutocompleteEditor,
	onStateChange?: (state: AutocompleteState) => void,
) {
	const newState = { ...initialAutocompleteState }
	editor.autocompleteState = newState
	onStateChange?.(newState)
}
