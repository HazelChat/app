"use client"

import { useOption } from "@react-aria/listbox"
import type { ComboBoxState } from "@react-stately/combobox"
import type { Node } from "@react-types/shared"
import { type ReactNode, useEffect, useRef } from "react"
import { cx } from "~/utils/cx"
import type { AutocompleteOption } from "./types"

interface AutocompleteListBoxProps<T> {
	/** ComboBox state from useSlateComboBox */
	state: ComboBoxState<AutocompleteOption<T>>
	/** Ref for the listbox element (from useSlateComboBox) */
	listBoxRef: React.RefObject<HTMLUListElement | null>
	/** Props to spread on the listbox element (from useSlateComboBox) */
	listBoxProps: React.HTMLAttributes<HTMLUListElement>
	/** Custom render function for items */
	renderItem?: (props: { option: AutocompleteOption<T>; isFocused: boolean }) => ReactNode
	/** Message to show when no options */
	emptyMessage?: string
	/** Additional class names */
	className?: string
}

/**
 * Autocomplete listbox using React Aria with virtual focus.
 *
 * This component receives state from useSlateComboBox and renders
 * the list items. All keyboard navigation and ARIA attributes are
 * handled by the parent hook.
 *
 * Features:
 * - Virtual focus (DOM focus stays in Slate editor)
 * - Keyboard navigation handled by useSlateComboBox
 * - Hover to focus items
 * - Auto-scroll focused items into view
 */
export function AutocompleteListBox<T>({
	state,
	listBoxRef,
	listBoxProps,
	renderItem,
	emptyMessage = "No results found",
	className,
}: AutocompleteListBoxProps<T>) {
	// Get the original items from the state (they have our custom data)
	const items = [...state.collection]

	if (items.length === 0) {
		return <div className="p-4 text-center text-muted-fg text-sm">{emptyMessage}</div>
	}

	return (
		<ul
			{...listBoxProps}
			ref={listBoxRef}
			className={cx("p-2 outline-none", className)}
			// Prevent clicks from stealing focus from editor
			onMouseDown={(e) => e.preventDefault()}
		>
			{items.map((item) => (
				<Option key={item.key} item={item} state={state} renderItem={renderItem} />
			))}
		</ul>
	)
}

interface OptionProps<T> {
	item: Node<AutocompleteOption<T>>
	state: ComboBoxState<AutocompleteOption<T>>
	renderItem?: (props: { option: AutocompleteOption<T>; isFocused: boolean }) => ReactNode
}

function Option<T>({ item, state, renderItem }: OptionProps<T>) {
	const ref = useRef<HTMLLIElement>(null)
	const { optionProps, isFocused, isDisabled } = useOption({ key: item.key }, state, ref)

	// Get the original option data
	const option = item.value as AutocompleteOption<T>

	// Scroll focused item into view
	useEffect(() => {
		if (isFocused && ref.current) {
			ref.current.scrollIntoView({ block: "nearest" })
		}
	}, [isFocused])

	return (
		<li
			{...optionProps}
			ref={ref}
			className={cx(
				"flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm",
				"outline-none transition-colors",
				isFocused && "bg-accent text-accent-fg",
				!isFocused && "hover:bg-accent/50",
				isDisabled && "cursor-not-allowed opacity-50",
			)}
		>
			{renderItem ? renderItem({ option, isFocused }) : <DefaultItemContent option={option} />}
		</li>
	)
}

/**
 * Default item content renderer
 */
function DefaultItemContent<T>({ option }: { option: AutocompleteOption<T> }) {
	return (
		<>
			{option.icon && <span className="shrink-0">{option.icon}</span>}
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium">{option.label}</div>
				{option.description && (
					<div className="truncate text-xs opacity-70">{option.description}</div>
				)}
			</div>
		</>
	)
}
