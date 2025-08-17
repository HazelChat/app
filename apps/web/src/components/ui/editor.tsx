"use client"

import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"
import type { PlateContentProps, PlateViewProps } from "platejs/react"
import { PlateContainer, PlateContent, PlateView } from "platejs/react"
import * as React from "react"

import { cn } from "~/lib/utils"

const editorContainerVariants = cva(
	"relative w-full cursor-text overflow-y-auto caret-brand-primary select-text selection:bg-brand-primary/25 focus-visible:outline-none [&_.slate-selection-area]:z-50 [&_.slate-selection-area]:border [&_.slate-selection-area]:border-brand-primary/25 [&_.slate-selection-area]:bg-brand-primary/15",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				comment: cn(
					"flex flex-wrap justify-between gap-1 px-1 py-0.5 text-sm",
					"rounded-md border-[1.5px] border-transparent bg-transparent",
					"has-[[data-slate-editor]:focus]:border-brand-primary/50 has-[[data-slate-editor]:focus]:ring-2 has-[[data-slate-editor]:focus]:ring-brand-primary/30",
					"has-aria-disabled:border-secondary has-aria-disabled:bg-tertiary",
				),
				default: "h-full",
				demo: "h-[650px]",
				select: cn(
					"group rounded-md border border-secondary ring-offset-primary focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2",
					"has-data-readonly:w-fit has-data-readonly:cursor-default has-data-readonly:border-transparent has-data-readonly:focus-within:[box-shadow:none]",
				),
			},
		},
	},
)

export function EditorContainer({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof editorContainerVariants>) {
	return (
		<PlateContainer
			className={cn("ignore-click-outside/toolbar", editorContainerVariants({ variant }), className)}
			{...props}
		/>
	)
}

const editorVariants = cva(
	cn(
		"group/editor",
		"relative w-full cursor-text overflow-x-hidden break-words whitespace-pre-wrap select-text",
		"rounded-md ring-offset-primary focus-visible:outline-none caret-fg-brand-primary",
		"placeholder:text-tertiary **:data-slate-placeholder:!top-1/2 **:data-slate-placeholder:-translate-y-1/2 **:data-slate-placeholder:text-tertiary/80 **:data-slate-placeholder:opacity-100!",
		"[&_strong]:font-bold",
	),
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			disabled: {
				true: "cursor-not-allowed opacity-50",
			},
			focused: {
				true: "ring-2 ring-brand ring-offset-2",
			},
			variant: {
				ai: "w-full px-0 text-base md:text-sm",
				aiChat: "max-h-[min(70vh,320px)] w-full max-w-[700px] overflow-y-auto px-3 py-2 text-base md:text-sm",
				chat: "w-full overflow-y-auto px-3 py-2 text-base md:text-sm focus:border-brand focus:outline-hidden",
				comment: cn("rounded-none border-none bg-transparent text-sm"),
				default: "size-full px-16 pt-4 pb-72 text-base sm:px-[max(64px,calc(50%-350px))]",
				demo: "size-full px-16 pt-4 pb-72 text-base sm:px-[max(64px,calc(50%-350px))]",
				fullWidth: "size-full px-16 pt-4 pb-72 text-base sm:px-24",
				none: "",
				select: "px-3 py-2 text-base data-readonly:w-fit",
			},
		},
	},
)

export type EditorProps = PlateContentProps & VariantProps<typeof editorVariants>

export const Editor = React.forwardRef<HTMLDivElement, EditorProps>(
	({ className, disabled, focused, variant, ...props }, ref) => {
		return (
			<PlateContent
				ref={ref}
				className={cn(
					editorVariants({
						disabled,
						focused,
						variant,
					}),
					className,
				)}
				disabled={disabled}
				disableDefaultStyles
				{...props}
			/>
		)
	},
)

Editor.displayName = "Editor"

export function EditorView({
	className,
	variant,
	...props
}: PlateViewProps & VariantProps<typeof editorVariants>) {
	return <PlateView {...props} className={cn(editorVariants({ variant }), className)} />
}

EditorView.displayName = "EditorView"
