"use client"

import { useCallback, useEffect, useState } from "react"
import type { AutocompleteOption } from "./types"

export interface UseSlateAutocompleteProps {
	/** Whether autocomplete is currently open */
	isOpen: boolean
	/** Number of items in the list */
	itemCount: number
	/** Callback when an item is selected */
	onSelect: (index: number) => void
	/** Callback when autocomplete should close */
	onClose: () => void
}

export interface UseSlateAutocompleteReturn {
	/** Currently focused index */
	activeIndex: number
	/** Set the active index (for hover) */
	setActiveIndex: (index: number) => void
	/** Handle keyboard events - returns true if event was handled */
	handleKeyDown: (event: React.KeyboardEvent) => boolean
}

/**
 * Simple hook for managing autocomplete keyboard navigation in Slate.
 *
 * Unlike Ariakit, this keeps focus in the Slate editor and handles
 * arrow keys, Enter, Tab, and Escape directly.
 *
 * Based on the Slate mentions example from the docs.
 */
export function useSlateAutocomplete({
	isOpen,
	itemCount,
	onSelect,
	onClose,
}: UseSlateAutocompleteProps): UseSlateAutocompleteReturn {
	const [activeIndex, setActiveIndex] = useState(0)

	// Reset index when closing or when item count changes significantly
	useEffect(() => {
		if (!isOpen) {
			setActiveIndex(0)
		}
	}, [isOpen])

	// Clamp index if it's out of bounds (e.g., items filtered down)
	useEffect(() => {
		if (activeIndex >= itemCount && itemCount > 0) {
			setActiveIndex(itemCount - 1)
		}
	}, [activeIndex, itemCount])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent): boolean => {
			if (!isOpen || itemCount === 0) {
				return false
			}

			switch (event.key) {
				case "ArrowDown":
					event.preventDefault()
					setActiveIndex((prev) => (prev >= itemCount - 1 ? 0 : prev + 1))
					return true

				case "ArrowUp":
					event.preventDefault()
					setActiveIndex((prev) => (prev <= 0 ? itemCount - 1 : prev - 1))
					return true

				case "Enter":
				case "Tab":
					event.preventDefault()
					onSelect(activeIndex)
					return true

				case "Escape":
					event.preventDefault()
					onClose()
					return true
			}

			return false
		},
		[isOpen, itemCount, activeIndex, onSelect, onClose],
	)

	return {
		activeIndex,
		setActiveIndex,
		handleKeyDown,
	}
}

/**
 * Get the original option data from items by index
 */
export function getOptionByIndex<T>(
	items: AutocompleteOption<T>[],
	index: number,
): AutocompleteOption<T> | undefined {
	return items[index]
}
