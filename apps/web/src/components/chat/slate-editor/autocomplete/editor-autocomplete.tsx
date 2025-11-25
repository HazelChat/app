"use client"

import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { cx } from "~/utils/cx"
import type { AutocompleteState } from "./types"

interface EditorAutocompleteProps {
	/** Ref to the editor container for positioning */
	containerRef: React.RefObject<HTMLElement | null>
	/** Current autocomplete state */
	state: AutocompleteState
	/** Content to render inside the popover */
	children: ReactNode
	/** Additional class names */
	className?: string
}

/**
 * Autocomplete popover container
 * Positions itself above the editor container, full width, with dynamic height
 */
export function EditorAutocomplete({ containerRef, state, children, className }: EditorAutocompleteProps) {
	const popoverRef = useRef<HTMLDivElement>(null)
	const [maxHeight, setMaxHeight] = useState(256)

	// Calculate dynamic max height based on available space above the input
	useLayoutEffect(() => {
		if (!containerRef.current || !state.isOpen) return

		const updateHeight = () => {
			const rect = containerRef.current?.getBoundingClientRect()
			if (!rect) return

			// Available space above input minus padding
			const available = rect.top - 16
			// Clamp between 150px and 400px
			setMaxHeight(Math.min(Math.max(available, 150), 400))
		}

		updateHeight()

		window.addEventListener("resize", updateHeight)
		window.addEventListener("scroll", updateHeight, { passive: true })

		return () => {
			window.removeEventListener("resize", updateHeight)
			window.removeEventListener("scroll", updateHeight)
		}
	}, [state.isOpen, containerRef])

	if (!state.isOpen) return null

	return (
		<div
			ref={popoverRef}
			role="listbox"
			id="editor-autocomplete-listbox"
			aria-label="Suggestions"
			// Prevent clicks from stealing focus from editor
			onMouseDown={(e) => e.preventDefault()}
			className={cx(
				"absolute bottom-full left-0 right-0 z-50 mb-2",
				"overflow-y-auto overflow-x-hidden rounded-xl",
				"border border-fg/10 bg-overlay shadow-lg",
				"animate-in fade-in slide-in-from-bottom-2 duration-150",
				className,
			)}
			style={{ maxHeight }}
		>
			{children}
		</div>
	)
}
