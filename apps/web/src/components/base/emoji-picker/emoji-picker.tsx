"use client"

import { Loading01 } from "@untitledui/icons"
import {
	type EmojiPickerListCategoryHeaderProps,
	type EmojiPickerListEmojiProps,
	type EmojiPickerListRowProps,
	EmojiPicker as EmojiPickerPrimitive,
} from "frimousse"
import type * as React from "react"
import IconMagnifier3 from "~/components/icons/icon-magnifier-3"
import { cx } from "~/utils/cx"

function EmojiPicker({ className, ...props }: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
	return (
		<EmojiPickerPrimitive.Root
			className={cx(
				"isolate flex h-full w-fit flex-col overflow-hidden rounded-md border-primary bg-secondary text-primary",
				className,
			)}
			data-slot="emoji-picker"
			{...props}
		/>
	)
}

function EmojiPickerSearch({
	className,
	...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
	return (
		<div
			className={cx("flex h-9 items-center gap-2 border-primary border-b px-3", className)}
			data-slot="emoji-picker-search-wrapper"
		>
			<IconMagnifier3 className="size-4 shrink-0 opacity-50" />
			<EmojiPickerPrimitive.Search
				className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
				data-slot="emoji-picker-search"
				{...props}
			/>
		</div>
	)
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
	return (
		<div {...props} className="scroll-my-1 px-1" data-slot="emoji-picker-row">
			{children}
		</div>
	)
}

function EmojiPickerEmoji({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
	return (
		<button
			{...props}
			className={cx(
				"flex size-7 items-center justify-center rounded-sm text-base data-[active]:bg-quaternary",
				className,
			)}
			data-slot="emoji-picker-emoji"
		>
			{emoji.emoji}
		</button>
	)
}

function EmojiPickerCategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
	return (
		<div
			{...props}
			className="bg-primary px-3 pt-3.5 pb-2 text-secondary text-xs leading-none"
			data-slot="emoji-picker-category-header"
		>
			{category.label}
		</div>
	)
}

function EmojiPickerContent({
	className,
	...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
	return (
		<EmojiPickerPrimitive.Viewport
			className={cx("relative flex-1 outline-hidden", className)}
			data-slot="emoji-picker-viewport"
			{...props}
		>
			<EmojiPickerPrimitive.Loading
				className="absolute inset-0 flex items-center justify-center text-muted-foreground"
				data-slot="emoji-picker-loading"
			>
				<Loading01 className="size-4 animate-spin" />
			</EmojiPickerPrimitive.Loading>
			<EmojiPickerPrimitive.Empty
				className="absolute inset-0 flex items-center justify-center text-secondary text-sm"
				data-slot="emoji-picker-empty"
			>
				No emoji found.
			</EmojiPickerPrimitive.Empty>
			<EmojiPickerPrimitive.List
				className="select-none pb-1"
				components={{
					Row: EmojiPickerRow,
					Emoji: EmojiPickerEmoji,
					CategoryHeader: EmojiPickerCategoryHeader,
				}}
				data-slot="emoji-picker-list"
			/>
		</EmojiPickerPrimitive.Viewport>
	)
}

function EmojiPickerFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cx(
				"flex w-full min-w-0 max-w-(--frimousse-viewport-width) items-center gap-1 border-primary border-t p-2",
				className,
			)}
			data-slot="emoji-picker-footer"
			{...props}
		>
			<EmojiPickerPrimitive.ActiveEmoji>
				{({ emoji }) =>
					emoji ? (
						<>
							<div className="flex size-7 flex-none items-center justify-center text-lg">
								{emoji.emoji}
							</div>
							<span className="truncate text-secondary text-xs">{emoji.label}</span>
						</>
					) : (
						<span className="ml-1.5 flex h-7 items-center truncate text-secondary text-xs">
							Select an emoji…
						</span>
					)
				}
			</EmojiPickerPrimitive.ActiveEmoji>
		</div>
	)
}

export { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter }
