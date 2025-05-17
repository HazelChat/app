// src/MarkdownInput.tsx
import { type JSX, Show, createEffect, createMemo, createSignal, on } from "solid-js"
import type { Accessor } from "solid-js"
import { getCaretCharacterOffsetWithin, setCaretByCharacterOffset } from "./caret-utils"
import { HighlightedCode } from "./highlighted-code" // Import new component
import { parseText } from "./parser"
import type { ParsedSegment, TokenRule } from "./types"

interface MarkdownInputProps {
	value: Accessor<string>
	onValueChange: (value: string) => void
	tokenRules: TokenRule[]
	placeholder?: string
	class?: string
	inputClass?: string
}

export function MarkdownInput(props: MarkdownInputProps) {
	let editorRef: HTMLDivElement | undefined
	const [currentText, setCurrentText] = createSignal(props.value())
	const [caretRestorePosition, setCaretRestorePosition] = createSignal<number | null>(null)
	const [isFocused, setIsFocused] = createSignal(false) // Track focus state

	// Sync external prop value changes
	createEffect(
		on(
			() => props.value(),
			(propVal) => {
				if (propVal !== currentText()) {
					// console.log("External value changed, updating currentText");
					setCurrentText(propVal)
					setCaretRestorePosition(null) // Reset pending restore
				}
			},
		),
	)

	const handleInput = (e: InputEvent) => {
		const target = e.currentTarget as HTMLDivElement
		const currentCaretOffset = getCaretCharacterOffsetWithin(target)
		// console.log("Saving caret offset:", currentCaretOffset, "for text length:", target.textContent?.length);
		setCaretRestorePosition(currentCaretOffset)

		const newText = target.textContent || ""
		setCurrentText(newText) // This will trigger parsedContent
		props.onValueChange(newText)
	}

	const parsedContent = createMemo<ParsedSegment[]>(() => {
		// console.log("Re-parsing text:", currentText().substring(0, 20) + "...");
		return parseText(currentText(), props.tokenRules)
	})

	// Effect to restore caret AFTER DOM updates
	createEffect(
		on(
			// React to parsedContent (indirectly currentText) AND caretRestorePosition
			// This ensures the effect runs if either the content changes or a restore is requested
			() => [parsedContent(), caretRestorePosition()] as const,
			([segments, positionToRestore]) => {
				// console.log("Caret restore effect triggered. Position to restore:", positionToRestore);
				if (editorRef && positionToRestore !== null && isFocused()) {
					// Use setTimeout to ensure this runs after all DOM updates,
					// including those from highlight.js's own effects.
					setTimeout(() => {
						if (
							editorRef &&
							isFocused() && // Check focus again inside timeout
							caretRestorePosition() === positionToRestore // Ensure position is still the one we want
						) {
							const currentContentLength = editorRef.textContent?.length || 0
							const finalRestorePosition = Math.min(positionToRestore, currentContentLength)
							// console.log(
							//   "setTimeout: Restoring caret. Original:",
							//   positionToRestore,
							//   "Adjusted:",
							//   finalRestorePosition,
							//   "New length:",
							//   currentContentLength,
							// );
							setCaretByCharacterOffset(editorRef, finalRestorePosition)
							setCaretRestorePosition(null) // Reset after attempting restore
						} else {
							// console.log(
							//   "setTimeout: Skipping caret restore - editor not active, or position changed/reset.",
							// );
							// If not restoring, but a position was set, clear it to prevent stale restores later
							if (caretRestorePosition() !== null) {
								setCaretRestorePosition(null)
							}
						}
					}, 0)
				} else if (positionToRestore !== null) {
					// If there was a position to restore but we didn't (e.g., not focused), clear it.
					// console.log("Caret restore effect: Not focused or no editorRef, clearing pending restore.");
					setCaretRestorePosition(null)
				}
			},
			{ defer: false }, // Run immediately after render if dependencies change
			// defer: true might also work, but let's try false first with setTimeout
		),
	)

	const renderSegmentsRevised = (segments: ParsedSegment[]): (string | JSX.Element)[] => {
		// console.log("Rendering segments:", segments.length);
		return segments.map((segment, index) => {
			if (segment.isCodeBlockContent) {
				return (
					<HighlightedCode
						code={segment.text}
						language={segment.language}
						data-key={`code-${index}`}
						class="editor-code-content"
						// onHighlighted={() => console.log(`Code block ${index} highlighted`)} // For debugging if needed
					/>
				)
			} else if (segment.className && segment.isToken) {
				return (
					<span class={segment.className} data-key={`token-${index}`}>
						{segment.text}
					</span>
				)
			}
			return segment.text
		})
	}

	return (
		<div
			ref={editorRef}
			contentEditable={true}
			onInput={handleInput}
			onFocus={() => setIsFocused(true)}
			onBlur={() => {
				setIsFocused(false)
				// console.log("Blur event, clearing pending caret restore.");
				// setCaretRestorePosition(null); // Optional: clear on blur
			}}
			class={`min-h-[40px] w-full whitespace-pre-wrap rounded-md border border-gray-300 p-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
				props.inputClass || ""
			}`}
			data-placeholder={props.placeholder}
			aria-multiline="true"
			spellcheck={false}
		>
			<Show
				when={parsedContent().length > 0 || currentText().length > 0} // Show if there's any text or parsed segments
				fallback={""} // CSS :empty selector handles placeholder
			>
				{renderSegmentsRevised(parsedContent())}
			</Show>
		</div>
	)
}
