"use client"

import { type ReactNode, useMemo } from "react"
import { AutocompleteListBox } from "../autocomplete-listbox"
import type { AutocompleteOption, AutocompleteState, CommandData } from "../types"

// Icons for commands
function IconCode({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="16 18 22 12 16 6" />
			<polyline points="8 6 2 12 8 18" />
		</svg>
	)
}

function IconQuote({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
			<path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
		</svg>
	)
}

function IconList({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<line x1="8" x2="21" y1="6" y2="6" />
			<line x1="8" x2="21" y1="12" y2="12" />
			<line x1="8" x2="21" y1="18" y2="18" />
			<line x1="3" x2="3.01" y1="6" y2="6" />
			<line x1="3" x2="3.01" y1="12" y2="12" />
			<line x1="3" x2="3.01" y1="18" y2="18" />
		</svg>
	)
}

function IconListOrdered({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<line x1="10" x2="21" y1="6" y2="6" />
			<line x1="10" x2="21" y1="12" y2="12" />
			<line x1="10" x2="21" y1="18" y2="18" />
			<path d="M4 6h1v4" />
			<path d="M4 10h2" />
			<path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
		</svg>
	)
}

function IconText({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M17 6.1H3" />
			<path d="M21 12.1H3" />
			<path d="M15.1 18H3" />
		</svg>
	)
}

/**
 * Command definition
 */
interface SlashCommand {
	id: string
	name: string
	description: string
	icon: ReactNode
	/** Block type to insert (used by the editor) */
	blockType: string
	/** Additional properties for the block */
	blockProps?: Record<string, unknown>
}

/**
 * Available slash commands
 */
const COMMANDS: SlashCommand[] = [
	{
		id: "code",
		name: "code",
		description: "Insert a code block",
		icon: <IconCode className="size-4" />,
		blockType: "code-block",
	},
	{
		id: "quote",
		name: "quote",
		description: "Insert a blockquote",
		icon: <IconQuote className="size-4" />,
		blockType: "blockquote",
	},
	{
		id: "list",
		name: "list",
		description: "Insert a bullet list",
		icon: <IconList className="size-4" />,
		blockType: "list-item",
		blockProps: { ordered: false },
	},
	{
		id: "numbered",
		name: "numbered",
		description: "Insert a numbered list",
		icon: <IconListOrdered className="size-4" />,
		blockType: "list-item",
		blockProps: { ordered: true },
	},
	{
		id: "subtext",
		name: "subtext",
		description: "Insert smaller, muted text",
		icon: <IconText className="size-4" />,
		blockType: "subtext",
	},
]

interface CommandTriggerProps {
	/** Items to display */
	items: AutocompleteOption<CommandData>[]
	/** Currently active index */
	activeIndex: number
	/** Callback when an item is selected */
	onSelect: (index: number) => void
	/** Callback when mouse hovers over an item */
	onHover: (index: number) => void
}

/**
 * Command trigger component
 * Renders command suggestions using simple index-based focus
 */
export function CommandTrigger({ items, activeIndex, onSelect, onHover }: CommandTriggerProps) {
	return (
		<AutocompleteListBox
			items={items}
			activeIndex={activeIndex}
			onSelect={onSelect}
			onHover={onHover}
			emptyMessage="No commands found"
		/>
	)
}

/**
 * Get command options for external use
 */
export function useCommandOptions(state: AutocompleteState): AutocompleteOption<CommandData>[] {
	return useMemo(() => {
		const search = state.search.toLowerCase()

		return COMMANDS.filter((cmd) => cmd.name.includes(search)).map((cmd) => ({
			id: cmd.id,
			label: `/${cmd.name}`,
			description: cmd.description,
			icon: cmd.icon,
			data: {
				id: cmd.id,
				name: cmd.name,
				description: cmd.description,
				execute: () => {},
			},
		}))
	}, [state.search])
}

/**
 * Get the command definition by ID
 */
export function getCommandById(id: string): SlashCommand | undefined {
	return COMMANDS.find((cmd) => cmd.id === id)
}

export { COMMANDS, type SlashCommand }
