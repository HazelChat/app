"use client"

import { useListBox, useOption } from "@react-aria/listbox"
import { Item } from "@react-stately/collections"
import { type ListState, useListState } from "@react-stately/list"
import type { Node } from "@react-types/shared"
import { type ReactNode, useEffect, useRef } from "react"
import { cx } from "~/utils/cx"
import type { AutocompleteOption } from "./types"

interface AutocompleteListBoxProps<T> {
	/** List of options to display */
	options: AutocompleteOption<T>[]
	/** Callback when an option is selected (via Enter or click) */
	onSelect: (option: AutocompleteOption<T>) => void
	/** Ref to attach to the listbox (for forwarding keyboard events) */
	listBoxRef?: React.RefObject<HTMLUListElement | null>
	/** Custom render function for items */
	renderItem?: (props: { option: AutocompleteOption<T>; isFocused: boolean }) => ReactNode
	/** Message to show when no options */
	emptyMessage?: string
	/** Additional class names */
	className?: string
}

/**
 * Autocomplete list using React Aria's useListBox with virtual focus.
 *
 * This component:
 * - Uses `shouldUseVirtualFocus: true` to keep DOM focus in Slate editor
 * - Manages focus state internally via React Aria's useListState
 * - Handles keyboard navigation automatically (ArrowUp/Down, Home/End)
 * - Highlights items on hover with `shouldFocusOnHover: true`
 */
export function AutocompleteListBox<T>({
	options,
	onSelect,
	listBoxRef,
	renderItem,
	emptyMessage = "No results found",
	className,
}: AutocompleteListBoxProps<T>) {
	const internalRef = useRef<HTMLUListElement>(null)
	const ref = listBoxRef ?? internalRef

	// Convert options to React Aria's collection format
	const items = options.map((opt) => ({
		id: opt.id,
		textValue: opt.label,
		option: opt,
	}))

	// useListState manages selection and focus state internally
	const state = useListState({
		items,
		children: (item) => <Item key={item.id}>{item.textValue}</Item>,
		selectionMode: "single",
		onSelectionChange: (keys) => {
			const key = [...keys][0]
			if (key != null) {
				const option = options.find((o) => o.id === key)
				if (option) {
					onSelect(option)
				}
			}
		},
	})

	// Auto-focus first item when options change
	useEffect(() => {
		if (options.length > 0 && state.selectionManager.focusedKey == null) {
			const firstKey = state.collection.getFirstKey()
			if (firstKey != null) {
				state.selectionManager.setFocusedKey(firstKey)
			}
		}
	}, [options, state.collection, state.selectionManager])

	const { listBoxProps } = useListBox(
		{
			"aria-label": "Suggestions",
			shouldUseVirtualFocus: true, // KEY: keeps DOM focus in Slate editor
			shouldFocusOnHover: true, // Highlight on hover
			autoFocus: "first", // Auto-focus first item on open
		},
		state,
		ref as React.RefObject<HTMLUListElement>,
	)

	if (options.length === 0) {
		return <div className="p-4 text-center text-muted-fg text-sm">{emptyMessage}</div>
	}

	return (
		<ul {...listBoxProps} ref={ref} className={cx("p-2 outline-none", className)}>
			{[...state.collection].map((item) => (
				<Option
					key={item.key}
					item={item}
					state={state}
					renderItem={renderItem}
					originalOption={options.find((o) => o.id === item.key)!}
				/>
			))}
		</ul>
	)
}

interface OptionProps<T> {
	item: Node<{ id: string; textValue: string; option: AutocompleteOption<T> }>
	state: ListState<{ id: string; textValue: string; option: AutocompleteOption<T> }>
	renderItem?: (props: { option: AutocompleteOption<T>; isFocused: boolean }) => ReactNode
	originalOption: AutocompleteOption<T>
}

function Option<T>({ item, state, renderItem, originalOption }: OptionProps<T>) {
	const ref = useRef<HTMLLIElement>(null)
	const { optionProps, isFocused, isDisabled } = useOption({ key: item.key }, state, ref)

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
				"transition-colors outline-none",
				isFocused && "bg-accent text-accent-fg",
				!isFocused && "hover:bg-accent/50",
				isDisabled && "cursor-not-allowed opacity-50",
			)}
		>
			{renderItem ? (
				renderItem({ option: originalOption, isFocused })
			) : (
				<DefaultItemContent option={originalOption} />
			)}
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
