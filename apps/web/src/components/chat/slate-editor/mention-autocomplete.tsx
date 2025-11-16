"use client"

import {
	Combobox,
	ComboboxItem,
	ComboboxPopover,
	ComboboxProvider,
	Portal,
	useComboboxStore,
} from "@ariakit/react"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { ReactEditor } from "slate-react"
import { channelMemberCollection, userCollection, userPresenceStatusCollection } from "~/db/collections"
import { cx } from "~/utils/cx"
import type { MentionEditor } from "./slate-mention-plugin"

interface MentionAutocompleteProps {
	editor: MentionEditor
	search: string
	onSelect: (id: string, displayName: string, type: "user" | "channel" | "here") => void
}

interface MentionOption {
	id: string
	type: "user" | "channel" | "here"
	displayName: string
	avatarUrl?: string
	status?: "online" | "offline" | "away" | "busy" | "dnd"
}

/**
 * Mention autocomplete component using Ariakit's ComboboxPopover
 * Automatically handles viewport constraints, flipping, and keyboard navigation
 */
export function MentionAutocomplete({ editor, search, onSelect }: MentionAutocompleteProps) {
	const { id: channelId } = useParams({ from: "/_app/$orgSlug/chat/$id" })
	const anchorRef = useRef<HTMLSpanElement | null>(null)
	const comboboxInputRef = useRef<HTMLInputElement>(null)
	const [anchorRect, setAnchorRect] = useState<{
		x: number
		y: number
		width: number
		height: number
	} | null>(null)

	// Fetch channel members with user data
	const { data: members } = useLiveQuery((q) =>
		q
			.from({ channelMember: channelMemberCollection })
			.innerJoin({ user: userCollection }, ({ channelMember, user }) =>
				eq(channelMember.userId, user.id),
			)
			.where(({ channelMember }) => eq(channelMember.channelId, channelId))
			.limit(100)
			.orderBy(({ channelMember }) => channelMember.joinedAt, "desc")
			.select(({ channelMember, user }) => ({
				...channelMember,
				user,
			})),
	)

	// Fetch user presence status
	const { data: presenceData } = useLiveQuery((q) =>
		q.from({ presence: userPresenceStatusCollection }).select(({ presence }) => presence),
	)

	// Create presence map for quick lookup
	const presenceMap = useMemo(() => {
		const map = new Map<string, "online" | "offline" | "away" | "busy" | "dnd">()
		presenceData?.forEach((p) => {
			map.set(p.userId, p.status)
		})
		return map
	}, [presenceData])

	// Build mention options (special mentions + users)
	const mentionOptions = useMemo<MentionOption[]>(() => {
		const options: MentionOption[] = []

		// Add special mentions
		options.push({
			id: "channel",
			type: "channel",
			displayName: "channel",
		})

		options.push({
			id: "here",
			type: "here",
			displayName: "here",
		})

		// Add users
		if (members) {
			for (const member of members) {
				// Skip if user data is missing
				if (!member.user) continue

				const userStatus = presenceMap.get(member.user.id)
				const status: "online" | "offline" | "away" | "busy" | "dnd" = userStatus || "offline"

				options.push({
					id: member.user.id,
					type: "user",
					displayName: `${member.user.firstName} ${member.user.lastName}`,
					avatarUrl: member.user.avatarUrl,
					status,
				})
			}
		}

		return options
	}, [members, presenceMap])

	// Filter options based on search text
	const filteredOptions = useMemo(() => {
		if (!search) return mentionOptions

		const lowerSearch = search.toLowerCase()
		return mentionOptions.filter((option) => option.displayName.toLowerCase().includes(lowerSearch))
	}, [mentionOptions, search])

	// Create combobox store
	const combobox = useComboboxStore({
		open: filteredOptions.length > 0,
		value: search,
		// Handle Enter key selection
		setValue: (value) => {
			const option = filteredOptions.find((opt) => opt.id === value)
			if (option) {
				onSelect(option.id, option.displayName, option.type)
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
		const { target } = editor.mentionState

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
							// Close the menu and reset mention state
							editor.mentionState = { active: false, search: "", start: null, target: null }
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
									onSelect(option.id, option.displayName, option.type)
									combobox.setOpen(false)
								}}
								className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/50 data-[active-item=true]:bg-accent data-[active-item=true]:text-accent-fg"
							>
								<div className="flex min-w-0 flex-1 items-center gap-2">
									{option.type === "user" && option.avatarUrl ? (
										<div className="relative shrink-0">
											<img
												src={option.avatarUrl}
												alt={option.displayName}
												className="size-6 rounded-md object-cover"
											/>
											{option.status && (
												<div
													className={cx(
														"absolute right-0 bottom-0 size-2 rounded-full border border-bg",
														option.status === "online" && "bg-success",
														option.status === "away" && "bg-warning",
														option.status === "offline" && "bg-muted",
													)}
												/>
											)}
										</div>
									) : (
										<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-medium text-primary-fg text-xs">
											@
										</div>
									)}

									<div className="min-w-0 flex-1">
										<div className="truncate font-medium">
											{option.type === "user"
												? option.displayName
												: `@${option.displayName}`}
										</div>
										{option.type !== "user" && (
											<div className="truncate text-muted-fg text-xs">
												{option.type === "channel"
													? "Notify all members in this channel"
													: "Notify all online members"}
											</div>
										)}
									</div>
								</div>
							</ComboboxItem>
						))}
					</ComboboxPopover>
				</Portal>
			</ComboboxProvider>
		</>
	)
}
