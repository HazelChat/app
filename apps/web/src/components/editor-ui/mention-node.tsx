"use client"

import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { getMentionOnSelectItem } from "@platejs/mention"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import type { TComboboxInputElement, TMentionElement } from "platejs"
import { IS_APPLE, KEYS } from "platejs"
import type { PlateElementProps } from "platejs/react"
import { PlateElement, useFocused, useReadOnly, useSelected } from "platejs/react"
import * as React from "react"
import { useMounted } from "~/hooks/use-mounted"
import { cn } from "~/lib/utils"
import {
	InlineCombobox,
	InlineComboboxContent,
	InlineComboboxEmpty,
	InlineComboboxGroup,
	InlineComboboxInput,
	InlineComboboxItem,
} from "./inline-combobox"

export function MentionElement(
	props: PlateElementProps<TMentionElement> & {
		prefix?: string
	},
) {
	const element = props.element

	const selected = useSelected()
	const focused = useFocused()
	const mounted = useMounted()
	const readOnly = useReadOnly()

	return (
		<PlateElement
			{...props}
			className={cn(
				"inline-block rounded-md bg-brand-primary/30 px-1.5 py-0.5 align-baseline font-medium",
				!readOnly && "cursor-pointer",
				selected && focused && "ring-2 ring-brand",
				element.children[0][KEYS.bold] === true && "font-bold",
				element.children[0][KEYS.italic] === true && "italic",
				element.children[0][KEYS.underline] === true && "underline",
			)}
			attributes={{
				...props.attributes,
				contentEditable: false,
				"data-slate-value": element.value,
				draggable: true,
			}}
		>
			{mounted && IS_APPLE ? (
				// Mac OS IME https://github.com/ianstormtaylor/slate/issues/3490
				<React.Fragment>
					{props.children}
					{props.prefix || "@"}
					{element.value}
				</React.Fragment>
			) : (
				// Others like Android https://github.com/ianstormtaylor/slate/pull/5360
				<React.Fragment>
					{props.prefix || "@"}
					{element.value}
					{props.children}
				</React.Fragment>
			)}
		</PlateElement>
	)
}

const onSelectItem = getMentionOnSelectItem()

export function MentionInputElement(props: PlateElementProps<TComboboxInputElement>) {
	const { id, orgId } = useParams({ from: "/_app/$orgId/chat/$id" })
	const { editor, element } = props
	const [search, setSearch] = React.useState("")

	const { data } = useQuery(
		convexQuery(api.channels.getChannelMembers, {
			channelId: id as Id<"channels">,
			limit: 100,
			searchQuery: search,
			organizationId: orgId as Id<"organizations">,
		}),
	)

	return (
		<PlateElement {...props} as="span">
			<InlineCombobox
				value={search}
				element={element}
				setValue={setSearch}
				showTrigger={false}
				trigger="@"
			>
				<span>
					@
					<InlineComboboxInput />
				</span>

				<InlineComboboxContent className="my-1.5">
					<InlineComboboxEmpty>No results</InlineComboboxEmpty>

					<InlineComboboxGroup>
						{data?.map((item) => (
							<InlineComboboxItem
								key={item._id}
								value={item.userId}
								onClick={() => {
									onSelectItem(
										editor,
										{
											key: item.userId,
											text: `${item.user.firstName} ${item.user.lastName}`,
										},
										search,
									)
								}}
							>
								{item.user.firstName} {item.user.lastName}
							</InlineComboboxItem>
						))}
					</InlineComboboxGroup>
				</InlineComboboxContent>
			</InlineCombobox>
			{props.children}
		</PlateElement>
	)
}
