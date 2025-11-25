import { useCallback, useMemo, useState } from "react"
import type { AutocompleteOption, AutocompleteState, AutocompleteTrigger } from "./types"
import { initialAutocompleteState } from "./types"

export interface UseEditorAutocompleteOptions {
	/** Callback when an option is selected */
	onSelect?: (option: AutocompleteOption, trigger: AutocompleteTrigger) => void
}

export interface UseEditorAutocompleteReturn {
	/** Current autocomplete state */
	state: AutocompleteState
	/** Set the full autocomplete state */
	setState: React.Dispatch<React.SetStateAction<AutocompleteState>>
	/** Open autocomplete with a specific trigger */
	open: (trigger: AutocompleteTrigger, startPoint: AutocompleteState["startPoint"]) => void
	/** Close autocomplete */
	close: () => void
	/** Update search text */
	setSearch: (search: string, targetRange: AutocompleteState["targetRange"]) => void
	/** Move highlight to next option */
	moveNext: (optionsLength: number) => void
	/** Move highlight to previous option */
	movePrevious: (optionsLength: number) => void
	/** Reset highlight to first option */
	resetHighlight: () => void
	/** Get the ID of the currently active option for aria-activedescendant */
	getActiveItemId: (options: AutocompleteOption[]) => string | undefined
}

/**
 * Hook to manage editor autocomplete state
 * Handles opening, closing, search updates, and keyboard navigation
 */
export function useEditorAutocomplete(
	options: UseEditorAutocompleteOptions = {},
): UseEditorAutocompleteReturn {
	const [state, setState] = useState<AutocompleteState>(initialAutocompleteState)

	const open = useCallback((trigger: AutocompleteTrigger, startPoint: AutocompleteState["startPoint"]) => {
		setState({
			isOpen: true,
			trigger,
			search: "",
			activeIndex: 0,
			startPoint,
			targetRange: startPoint ? { anchor: startPoint, focus: startPoint } : null,
		})
	}, [])

	const close = useCallback(() => {
		setState(initialAutocompleteState)
	}, [])

	const setSearch = useCallback((search: string, targetRange: AutocompleteState["targetRange"]) => {
		setState((prev) => ({
			...prev,
			search,
			targetRange,
			activeIndex: 0, // Reset highlight on search change
		}))
	}, [])

	const moveNext = useCallback((optionsLength: number) => {
		if (optionsLength === 0) return
		setState((prev) => ({
			...prev,
			activeIndex: (prev.activeIndex + 1) % optionsLength,
		}))
	}, [])

	const movePrevious = useCallback((optionsLength: number) => {
		if (optionsLength === 0) return
		setState((prev) => ({
			...prev,
			activeIndex: (prev.activeIndex - 1 + optionsLength) % optionsLength,
		}))
	}, [])

	const resetHighlight = useCallback(() => {
		setState((prev) => ({
			...prev,
			activeIndex: 0,
		}))
	}, [])

	const getActiveItemId = useCallback(
		(autocompleteOptions: AutocompleteOption[]): string | undefined => {
			if (!state.isOpen || autocompleteOptions.length === 0) return undefined
			const activeOption = autocompleteOptions[state.activeIndex]
			return activeOption ? `autocomplete-option-${activeOption.id}` : undefined
		},
		[state.isOpen, state.activeIndex],
	)

	return useMemo(
		() => ({
			state,
			setState,
			open,
			close,
			setSearch,
			moveNext,
			movePrevious,
			resetHighlight,
			getActiveItemId,
		}),
		[state, open, close, setSearch, moveNext, movePrevious, resetHighlight, getActiveItemId],
	)
}
