import type { BaseEditor } from "slate"
import { Editor, Point, Range, Element as SlateElement, Text, Transforms } from "slate"
import type { HistoryEditor } from "slate-history"
import type { ReactEditor } from "slate-react"

// Extend the editor type
type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

export interface MentionElement {
	type: "mention"
	userId: string
	displayName: string
	children: [{ text: "" }]
}

export interface MentionState {
	active: boolean
	search: string
	start: Point | null
	target: Range | null
}

// Add mention state to editor
export interface MentionEditor extends CustomEditor {
	mentionState: MentionState
}

/**
 * Plugin to add @mention functionality to Slate editor
 * Detects @ character and tracks mention state for autocomplete
 */
export const withMentions = (editor: any): MentionEditor => {
	const { insertText, deleteBackward, insertBreak } = editor
	const mentionEditor = editor as MentionEditor

	// Initialize mention state
	mentionEditor.mentionState = {
		active: false,
		search: "",
		start: null,
		target: null,
	}

	// Override insertText to detect @ and track search text
	mentionEditor.insertText = (text: string) => {
		const { selection } = mentionEditor

		if (text === "@" && selection && Range.isCollapsed(selection)) {
			// Check if @ is at start or preceded by whitespace/punctuation
			const { anchor } = selection
			const before = Editor.before(mentionEditor, anchor, { unit: "character" })
			const beforeChar = before ? Editor.string(mentionEditor, { anchor: before, focus: anchor }) : ""

			// Start mention if at start or after whitespace
			if (!beforeChar || /[\s"']/.test(beforeChar)) {
				mentionEditor.mentionState = {
					active: true,
					search: "",
					start: anchor,
					target: { anchor, focus: anchor },
				}
			}
		} else if (mentionEditor.mentionState.active && selection && Range.isCollapsed(selection)) {
			// Update search text
			const { start } = mentionEditor.mentionState

			if (start) {
				const after = Editor.after(mentionEditor, selection.anchor, { unit: "character" })
				const afterPoint = after || selection.anchor

				// Check if we're still in the mention range
				const range = Editor.range(mentionEditor, start, afterPoint)
				const searchText = Editor.string(mentionEditor, range)

				// Cancel mention on whitespace (except the initial @)
				if (/\s/.test(text)) {
					mentionEditor.mentionState = {
						active: false,
						search: "",
						start: null,
						target: null,
					}
				} else {
					// Update search text (remove the @ prefix)
					const newSearch = (searchText + text).replace(/^@/, "")

					mentionEditor.mentionState = {
						...mentionEditor.mentionState,
						search: newSearch,
						target: { anchor: start, focus: afterPoint },
					}
				}
			}
		}

		insertText(text)
	}

	// Override deleteBackward to update mention state
	mentionEditor.deleteBackward = (...args) => {
		const { selection, mentionState } = mentionEditor

		if (mentionState.active && selection && Range.isCollapsed(selection) && mentionState.start) {
			// Check if we're deleting past the @ symbol
			const { anchor } = selection
			const isAtStart = Point.equals(anchor, mentionState.start)

			if (isAtStart) {
				// Cancel mention
				mentionEditor.mentionState = {
					active: false,
					search: "",
					start: null,
					target: null,
				}
			} else {
				// Update search text
				const newSearch = mentionState.search.slice(0, -1)

				mentionEditor.mentionState = {
					...mentionState,
					search: newSearch,
					target: mentionState.target
						? {
								...mentionState.target,
								focus:
									Editor.before(mentionEditor, mentionState.target.focus, {
										unit: "character",
									}) || mentionState.target.focus,
							}
						: null,
				}
			}
		}

		deleteBackward(...args)
	}

	// Override insertBreak to cancel mention on Enter (unless selecting from dropdown)
	mentionEditor.insertBreak = () => {
		if (mentionEditor.mentionState.active) {
			// Cancel mention
			mentionEditor.mentionState = {
				active: false,
				search: "",
				start: null,
				target: null,
			}
		}

		insertBreak()
	}

	return mentionEditor
}

/**
 * Insert a mention node into the editor
 * Called when user selects a mention from the autocomplete
 */
export function insertMention(
	editor: MentionEditor,
	userId: string,
	displayName: string,
	mentionType: "user" | "channel" | "here" = "user",
) {
	const { mentionState } = editor
	const { target, start } = mentionState

	if (!target || !start) return

	// Delete the @ and search text
	const range = {
		anchor: start,
		focus: target.focus,
	}

	// Determine the actual userId based on type
	const actualUserId = mentionType === "user" ? userId : mentionType

	// Create mention node with markdown link format
	const mentionText = `@[${displayName}](${actualUserId})`

	// Select the mention range and delete it
	Transforms.select(editor, range)
	Transforms.delete(editor)

	// Insert the mention as plain text (will be decorated/parsed)
	Transforms.insertText(editor, mentionText)

	// Add space after mention
	Transforms.insertText(editor, " ")

	// Reset mention state
	editor.mentionState = {
		active: false,
		search: "",
		start: null,
		target: null,
	}

	// Focus editor
	Editor.normalize(editor, { force: true })
}

/**
 * Cancel the current mention
 */
export function cancelMention(editor: MentionEditor) {
	editor.mentionState = {
		active: false,
		search: "",
		start: null,
		target: null,
	}
}

/**
 * Check if a node is a mention element
 */
export function isMentionElement(node: any): node is MentionElement {
	return SlateElement.isElement(node) && (node as any).type === "mention"
}

/**
 * Check if text contains mention markdown pattern
 */
export function hasMentionPattern(text: string): boolean {
	return /@\[([^\]]+)\]\(([^)]+)\)/.test(text)
}

/**
 * Extract mentions from text
 * Returns array of matches with userId and displayName
 */
export function extractMentions(
	text: string,
): Array<{ userId: string; displayName: string; fullMatch: string }> {
	const mentions: Array<{ userId: string; displayName: string; fullMatch: string }> = []
	const pattern = /@\[([^\]]+)\]\(([^)]+)\)/g
	let match: RegExpExecArray | null

	while ((match = pattern.exec(text)) !== null) {
		const displayName = match[1]
		const userId = match[2]

		if (displayName && userId) {
			mentions.push({
				displayName,
				userId,
				fullMatch: match[0],
			})
		}
	}

	return mentions
}
