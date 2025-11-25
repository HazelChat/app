"use client"

import { useListBox } from "@react-aria/listbox"
import { ListKeyboardDelegate, useSelectableCollection } from "@react-aria/selection"
import { Item } from "@react-stately/collections"
import type { ComboBoxState } from "@react-stately/combobox"
import { useComboBoxState } from "@react-stately/combobox"
import type { Key } from "@react-types/shared"
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { AutocompleteOption } from "./types"

export interface UseSlateComboBoxProps<T> {
	/** Items to display in the listbox */
	items: AutocompleteOption<T>[]
	/** Whether the listbox is open */
	isOpen: boolean
	/** Current search/filter text */
	inputValue: string
	/** Callback when open state changes */
	onOpenChange: (isOpen: boolean) => void
	/** Callback when selection changes */
	onSelectionChange: (key: Key) => void
}

export interface UseSlateComboBoxReturn<T> {
	/** The combobox state from React Stately */
	state: ComboBoxState<AutocompleteOption<T>>
	/** Ref for the listbox element */
	listBoxRef: React.RefObject<HTMLUListElement | null>
	/** Props to spread on the listbox element */
	listBoxProps: React.HTMLAttributes<HTMLUListElement>
	/** Handle keyboard events from Slate editor - returns true if event was handled */
	handleKeyDown: (event: React.KeyboardEvent) => boolean
}

/**
 * Hook that bridges Slate.js with React Aria's combobox pattern.
 *
 * Uses useComboBoxState for state management and useSelectableCollection
 * for keyboard navigation. The Slate editor acts as a "virtual" input -
 * we don't attach to a real input element, but forward keyboard events.
 *
 * Features:
 * - Virtual focus (DOM focus stays in Slate)
 * - Keyboard navigation (ArrowUp/Down, Home/End, PageUp/PageDown)
 * - Selection on Enter
 * - Focus on hover
 */
export function useSlateComboBox<T>({
	items,
	isOpen,
	inputValue,
	onOpenChange,
	onSelectionChange,
}: UseSlateComboBoxProps<T>): UseSlateComboBoxReturn<T> {
	const listBoxRef = useRef<HTMLUListElement>(null)

	// Create a fake input ref for useSelectableCollection
	// We don't actually use this, but the hook requires it
	const fakeInputRef = useRef<HTMLInputElement>(null)

	// Convert our items to the format React Stately expects
	const statelyItems = useMemo(
		() =>
			items.map((item) => ({
				...item,
				key: item.id,
				textValue: item.label,
			})),
		[items],
	)

	// Create combobox state
	const state = useComboBoxState({
		items: statelyItems,
		children: (item) => <Item key={item.key}>{item.label}</Item>,
		inputValue,
		onOpenChange,
		onSelectionChange: (key) => {
			if (key != null) onSelectionChange(key)
		},
		// Don't filter - we handle filtering externally
		defaultFilter: () => true,
		// Manual trigger - we control open/close via Slate plugin
		menuTrigger: "manual",
		// Allow the same item to be selected again (useful for commands)
		allowsEmptyCollection: true,
	})

	// Sync external isOpen state with combobox state
	useEffect(() => {
		if (isOpen && !state.isOpen) {
			state.open()
		} else if (!isOpen && state.isOpen) {
			state.close()
		}
	}, [isOpen, state])

	// Create keyboard delegate for navigation
	const delegate = useMemo(
		() =>
			new ListKeyboardDelegate({
				collection: state.collection,
				disabledKeys: state.selectionManager.disabledKeys,
				ref: listBoxRef,
			}),
		[state.collection, state.selectionManager.disabledKeys],
	)

	// Get keyboard handlers via useSelectableCollection
	const { collectionProps } = useSelectableCollection({
		selectionManager: state.selectionManager,
		keyboardDelegate: delegate,
		disallowTypeAhead: true,
		disallowEmptySelection: true,
		ref: fakeInputRef,
		isVirtualized: true,
	})

	// Get listbox props
	const { listBoxProps } = useListBox(
		{
			"aria-label": "Suggestions",
			shouldUseVirtualFocus: true,
			shouldFocusOnHover: true,
			autoFocus: "first",
		},
		state,
		listBoxRef,
	)

	// Handler to forward keyboard events from Slate
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent): boolean => {
			// Don't handle if closed or no items
			if (!isOpen || items.length === 0) return false

			// Skip if composing (IME input)
			if (event.nativeEvent.isComposing) return false

			const navigationKeys = ["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]
			const selectionKeys = ["Enter"]

			if (navigationKeys.includes(event.key)) {
				// Forward to React Aria's keyboard handler
				collectionProps.onKeyDown?.(event as any)
				event.preventDefault()
				return true
			}

			if (selectionKeys.includes(event.key)) {
				// Get the focused item and trigger selection
				const focusedKey = state.selectionManager.focusedKey
				if (focusedKey != null) {
					onSelectionChange(focusedKey)
					event.preventDefault()
					return true
				}
			}

			return false
		},
		[isOpen, items.length, collectionProps, state.selectionManager.focusedKey, onSelectionChange],
	)

	return {
		state,
		listBoxRef,
		listBoxProps,
		handleKeyDown,
	}
}

/**
 * Get the original option data from a collection item key
 */
export function getOptionByKey<T>(
	items: AutocompleteOption<T>[],
	key: Key | null,
): AutocompleteOption<T> | undefined {
	if (key == null) return undefined
	return items.find((item) => item.id === key)
}
