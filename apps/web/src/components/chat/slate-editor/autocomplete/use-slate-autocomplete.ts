"use client"

import { useRef, useCallback } from "react"

interface UseSlateAutocompleteReturn {
	/** Ref to attach to the listbox element */
	listBoxRef: React.RefObject<HTMLUListElement | null>
	/**
	 * Forward keyboard events from Slate to React Aria's listbox.
	 * Call this in Slate's onKeyDown handler when autocomplete is open.
	 * Returns true if the event was handled (and should be prevented).
	 */
	handleKeyDown: (event: React.KeyboardEvent) => boolean
}

/**
 * Hook that bridges Slate.js keyboard events to React Aria's listbox.
 *
 * React Aria's useListBox with `shouldUseVirtualFocus: true` handles all
 * the keyboard navigation internally - we just need to forward the events.
 *
 * Usage:
 * ```tsx
 * const { listBoxRef, handleKeyDown } = useSlateAutocomplete()
 *
 * // In Slate's onKeyDown:
 * if (autocompleteIsOpen && handleKeyDown(event)) {
 *   return // Event was handled by the listbox
 * }
 *
 * // Pass ref to AutocompleteListBox:
 * <AutocompleteListBox listBoxRef={listBoxRef} ... />
 * ```
 */
export function useSlateAutocomplete(): UseSlateAutocompleteReturn {
	const listBoxRef = useRef<HTMLUListElement>(null)

	const handleKeyDown = useCallback((event: React.KeyboardEvent): boolean => {
		if (!listBoxRef.current) return false

		// Keys that React Aria's listbox handles
		const forwardKeys = ["ArrowUp", "ArrowDown", "Enter", "Home", "End", "PageUp", "PageDown"]

		if (forwardKeys.includes(event.key)) {
			// Create a new keyboard event and dispatch it to the listbox
			const listBoxEvent = new KeyboardEvent("keydown", {
				key: event.key,
				code: event.code,
				bubbles: true,
				cancelable: true,
			})

			listBoxRef.current.dispatchEvent(listBoxEvent)
			event.preventDefault()
			return true
		}

		return false
	}, [])

	return {
		listBoxRef,
		handleKeyDown,
	}
}
