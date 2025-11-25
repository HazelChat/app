"use client"

import { eq, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { useMemo } from "react"
import { channelMemberCollection, userCollection, userPresenceStatusCollection } from "~/db/collections"
import { cx } from "~/utils/cx"
import { AutocompleteListBox } from "../autocomplete-listbox"
import type { AutocompleteOption, AutocompleteState, MentionData } from "../types"
import type { ComboBoxState } from "@react-stately/combobox"

interface MentionTriggerProps {
	/** ComboBox state from useSlateComboBox */
	state: ComboBoxState<AutocompleteOption<MentionData>>
	/** Ref for the listbox element */
	listBoxRef: React.RefObject<HTMLUListElement | null>
	/** Props to spread on the listbox element */
	listBoxProps: React.HTMLAttributes<HTMLUListElement>
}

/**
 * Mention trigger component
 * Renders mention suggestions using React Aria's ListBox with virtual focus
 */
export function MentionTrigger({ state, listBoxRef, listBoxProps }: MentionTriggerProps) {
	return (
		<AutocompleteListBox
			state={state}
			listBoxRef={listBoxRef}
			listBoxProps={listBoxProps}
			emptyMessage="No users found"
			renderItem={({ option, isFocused }) => <MentionItem option={option} isHighlighted={isFocused} />}
		/>
	)
}

interface MentionItemProps {
	option: AutocompleteOption<MentionData>
	isHighlighted: boolean
}

function MentionItem({ option }: MentionItemProps) {
	const { data } = option

	return (
		<div className="flex items-center gap-2">
			{data.type === "user" && data.avatarUrl ? (
				<div className="relative shrink-0">
					<img
						src={data.avatarUrl}
						alt={data.displayName}
						className="size-6 rounded-md object-cover"
					/>
					{data.status && (
						<div
							className={cx(
								"absolute right-0 bottom-0 size-2 rounded-full border border-bg",
								data.status === "online" && "bg-success",
								data.status === "away" && "bg-warning",
								data.status === "offline" && "bg-muted",
								data.status === "busy" && "bg-danger",
								data.status === "dnd" && "bg-danger",
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
					{data.type === "user" ? option.label : `@${data.displayName}`}
				</div>
				{option.description && (
					<div className="truncate text-muted-fg text-xs">{option.description}</div>
				)}
			</div>
		</div>
	)
}

/**
 * Get the filtered options for mentions
 */
export function useMentionOptions(state: AutocompleteState) {
	const { id: channelId } = useParams({ from: "/_app/$orgSlug/chat/$id" })

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

	const { data: presenceData } = useLiveQuery((q) =>
		q.from({ presence: userPresenceStatusCollection }).select(({ presence }) => presence),
	)

	const presenceMap = useMemo(() => {
		const map = new Map<string, "online" | "offline" | "away" | "busy" | "dnd">()
		presenceData?.forEach((p) => {
			map.set(p.userId, p.status)
		})
		return map
	}, [presenceData])

	return useMemo<AutocompleteOption<MentionData>[]>(() => {
		const opts: AutocompleteOption<MentionData>[] = []
		const search = state.search.toLowerCase()

		if ("channel".includes(search)) {
			opts.push({
				id: "channel",
				label: "@channel",
				description: "Notify all members in this channel",
				data: { id: "channel", type: "channel", displayName: "channel" },
			})
		}

		if ("here".includes(search)) {
			opts.push({
				id: "here",
				label: "@here",
				description: "Notify all online members",
				data: { id: "here", type: "here", displayName: "here" },
			})
		}

		if (members) {
			for (const member of members) {
				if (!member.user) continue

				const displayName = `${member.user.firstName} ${member.user.lastName}`
				if (!displayName.toLowerCase().includes(search)) continue

				const status = presenceMap.get(member.user.id) ?? "offline"

				opts.push({
					id: member.user.id,
					label: displayName,
					data: {
						id: member.user.id,
						type: "user",
						displayName,
						avatarUrl: member.user.avatarUrl,
						status,
					},
				})
			}
		}

		return opts
	}, [state.search, members, presenceMap])
}
