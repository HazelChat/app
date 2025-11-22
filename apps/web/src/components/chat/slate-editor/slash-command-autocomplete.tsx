import {
	Combobox,
	ComboboxItem,
	ComboboxPopover,
	ComboboxProvider,
	Portal,
	useComboboxStore,
} from "@ariakit/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ReactEditor } from "slate-react"
import type { SlashCommandEditor } from "./slate-slash-command-plugin"

interface SlashCommandAutocompleteProps {
	editor: SlashCommandEditor
	search: string
	onSelect: (command: SlashCommandOption) => void
}

export interface SlashCommandOption {
	id: string
	type: "text" | "action"
	label: string
	description: string
	value?: string
}

const SLASH_COMMANDS: SlashCommandOption[] = [
	{
		id: "github",
		type: "action",
		label: "/github",
		description: "Create a new GitHub issue",
	},
	{
		id: "shrug",
		type: "text",
		label: "/shrug",
		description: "Appends ¯\\_(ツ)_/¯ to your message",
		value: "¯\\_(ツ)_/¯",
	},
	{
		id: "tableflip",
		type: "text",
		label: "/tableflip",
		description: "Appends (╯°□°)╯︵ ┻━┻ to your message",
		value: "(╯°□°)╯︵ ┻━┻",
	},
	{
		id: "unflip",
		type: "text",
		label: "/unflip",
		description: "Appends ┬─┬ノ( º _ ºノ) to your message",
		value: "┬─┬ノ( º _ ºノ)",
	},
	{
		id: "lenny",
		type: "text",
		label: "/lenny",
		description: "Appends ( ͡° ͜ʖ ͡°) to your message",
		value: "( ͡° ͜ʖ ͡°)",
	},
]

/**
 * Slash command autocomplete component using Ariakit's ComboboxPopover
 */
export function SlashCommandAutocomplete({ editor, search, onSelect }: SlashCommandAutocompleteProps) {
	const anchorRef = useRef<HTMLSpanElement | null>(null)
	const comboboxInputRef = useRef<HTMLInputElement>(null)
	const [anchorRect, setAnchorRect] = useState<{
		x: number
		y: number
		width: number
		height: number
	} | null>(null)

	// Filter options based on search text
	const filteredOptions = useMemo(() => {
		if (!search) return SLASH_COMMANDS

		const lowerSearch = search.toLowerCase()
		return SLASH_COMMANDS.filter(
			(option) =>
				option.label.toLowerCase().includes(lowerSearch) ||
				option.description.toLowerCase().includes(lowerSearch),
		)
	}, [search])

	// Create combobox store
	const combobox = useComboboxStore({
		open: filteredOptions.length > 0,
		value: search,
		setValue: (value) => {
			const option = filteredOptions.find((opt) => opt.id === value)
			if (option) {
				onSelect(option)
				combobox.setOpen(false)
			}
		},
	})

	// Auto-select first item when menu opens or items change
	useEffect(() => {
		if (filteredOptions.length > 0 && !combobox.getState().activeId) {
			combobox.setActiveId(combobox.first())
		}
	}, [combobox, filteredOptions])

	// Focus the hidden combobox input when menu opens
	useEffect(() => {
		if (filteredOptions.length > 0) {
			comboboxInputRef.current?.focus()
		}
	}, [filteredOptions.length])

	// Update anchor position based on cursor location
	useEffect(() => {
		const { target } = editor.slashCommandState

		if (target && filteredOptions.length > 0) {
			try {
				const domRange = ReactEditor.toDOMRange(editor, target)
				const rect = domRange.getBoundingClientRect()

				// Set anchor rect for Ariakit positioning
				setAnchorRect({
					x: rect.left,
					y: rect.bottom,
					width: 0,
					height: 0,
				})

				// Also position the hidden anchor element
				if (anchorRef.current) {
					anchorRef.current.style.position = "fixed"
					anchorRef.current.style.top = `${rect.bottom}px`
					anchorRef.current.style.left = `${rect.left}px`
					anchorRef.current.style.width = "0"
					anchorRef.current.style.height = "0"
				}

				combobox.setOpen(true)
			} catch (_e) {
				// If the range is invalid, hide the menu
				setAnchorRect(null)
				combobox.setOpen(false)
			}
		} else {
			setAnchorRect(null)
			combobox.setOpen(false)
		}
	}, [editor, filteredOptions.length, combobox])

	if (filteredOptions.length === 0) {
		return null
	}

	return (
		<>
			{/* Hidden Combobox input for keyboard navigation */}
			<Combobox
				ref={comboboxInputRef}
				store={combobox}
				autoSelect
				style={{
					position: "fixed",
					opacity: 0,
					pointerEvents: "none",
					width: 0,
					height: 0,
				}}
			/>

			{/* Hidden anchor element for positioning */}
			<span
				ref={anchorRef}
				style={{
					position: "fixed",
					pointerEvents: "none",
					width: 0,
					height: 0,
				}}
			/>

			<ComboboxProvider store={combobox}>
				<Portal>
					<ComboboxPopover
						getAnchorRect={() => anchorRect}
						gutter={4}
						hideOnInteractOutside={(_event) => {
							// Close the menu and reset slash command state
							editor.slashCommandState = {
								active: false,
								search: "",
								start: null,
								target: null,
							}
							combobox.setOpen(false)
							return true
						}}
						className="z-500 max-h-64 w-64 overflow-y-auto rounded-xl border border-fg/10 bg-overlay p-2 shadow-lg"
					>
						{filteredOptions.map((option) => (
							<ComboboxItem
								key={option.id}
								value={option.id}
								onClick={() => {
									onSelect(option)
									combobox.setOpen(false)
								}}
								className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/50 data-[active-item=true]:bg-accent data-[active-item=true]:text-accent-fg"
							>
								<div className="min-w-0 flex-1">
									<div className="font-medium">{option.label}</div>
									<div className="truncate text-muted-fg text-xs">{option.description}</div>
								</div>
							</ComboboxItem>
						))}
					</ComboboxPopover>
				</Portal>
			</ComboboxProvider>
		</>
	)
}
