"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { cx } from "~/utils/cx"
import type { AutocompleteItemRenderProps, AutocompleteOption } from "./types"

interface AutocompleteListProps<T> {
	/** List of options to display */
	options: AutocompleteOption<T>[]
	/** Currently highlighted index */
	activeIndex: number
	/** Callback when an option is selected (clicked) */
	onSelect: (option: AutocompleteOption<T>) => void
	/** Callback when mouse enters an option (for highlight on hover) */
	onHover: (index: number) => void
	/** Custom render function for items */
	renderItem?: (props: AutocompleteItemRenderProps<T>) => ReactNode
	/** Message to show when no options */
	emptyMessage?: string
	/** Additional class names */
	className?: string
}

/**
 * Autocomplete suggestion list
 * Handles scrolling highlighted items into view
 */
export function AutocompleteList<T>({
	options,
	activeIndex,
	onSelect,
	onHover,
	renderItem,
	emptyMessage = "No results found",
	className,
}: AutocompleteListProps<T>) {
	const listRef = useRef<HTMLDivElement>(null)

	// Scroll highlighted item into view
	useEffect(() => {
		const item = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
		item?.scrollIntoView({ block: "nearest" })
	}, [activeIndex])

	if (options.length === 0) {
		return <div className="p-4 text-center text-muted-fg text-sm">{emptyMessage}</div>
	}

	return (
		<div ref={listRef} className={cx("p-2", className)}>
			{options.map((option, index) => (
				<AutocompleteItem
					key={option.id}
					option={option}
					index={index}
					isHighlighted={index === activeIndex}
					onMouseEnter={() => onHover(index)}
					onClick={() => onSelect(option)}
					renderItem={renderItem}
				/>
			))}
		</div>
	)
}

interface AutocompleteItemProps<T> {
	option: AutocompleteOption<T>
	index: number
	isHighlighted: boolean
	onMouseEnter: () => void
	onClick: () => void
	renderItem?: (props: AutocompleteItemRenderProps<T>) => ReactNode
}

function AutocompleteItem<T>({
	option,
	index,
	isHighlighted,
	onMouseEnter,
	onClick,
	renderItem,
}: AutocompleteItemProps<T>) {
	return (
		<div
			role="option"
			id={`autocomplete-option-${option.id}`}
			data-index={index}
			aria-selected={isHighlighted}
			aria-disabled={option.disabled}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
			className={cx(
				"flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm",
				"transition-colors",
				isHighlighted && "bg-accent text-accent-fg",
				!isHighlighted && "hover:bg-accent/50",
				option.disabled && "cursor-not-allowed opacity-50",
			)}
		>
			{renderItem ? renderItem({ option, isHighlighted }) : <DefaultItemContent option={option} />}
		</div>
	)
}

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
