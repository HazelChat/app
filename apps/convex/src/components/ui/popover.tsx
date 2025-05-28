import { Popover as PopoverPrimitive } from "@ark-ui/solid"
import { Show, splitProps } from "solid-js"
import { Portal } from "solid-js/web"
import { twMerge } from "tailwind-merge"

const PopoverRoot = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverCloseTrigger = PopoverPrimitive.CloseTrigger

export interface PopoverContentProps extends PopoverPrimitive.ContentProps {
	withArrow?: boolean
}

const PopoverContent = (props: PopoverContentProps) => {
	const [local, rest] = splitProps(props, ["class", "withArrow", "children"])

	return (
		<Portal>
			<PopoverPrimitive.Positioner>
				<Show when={local.withArrow}>
					<PopoverPrimitive.Arrow>
						<PopoverPrimitive.ArrowTip />
					</PopoverPrimitive.Arrow>
				</Show>
				<PopoverPrimitive.Content
					class={twMerge(
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-[--radix-popover-content-transform-origin] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
						local.class,
					)}
					{...rest}
				>
					{local.children}
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Positioner>
		</Portal>
	)
}

export const PopoverTitle = (props: PopoverPrimitive.TitleProps) => {
	const [local, rest] = splitProps(props, ["class"])

	return (
		<PopoverPrimitive.Title
			class={twMerge("font-semibold text-lg leading-none tracking-tight", local.class)}
			{...rest}
		/>
	)
}

export const PopoverDescription = (props: PopoverPrimitive.TitleProps) => {
	const [local, rest] = splitProps(props, ["class"])

	return <PopoverPrimitive.Description class={twMerge("text-muted-foreground text-sm", local.class)} {...rest} />
}

const Popover = Object.assign(PopoverRoot, {
	Trigger: PopoverTrigger,
	Anchor: PopoverAnchor,
	Content: PopoverContent,
	CloseTrigger: PopoverCloseTrigger,

	Title: PopoverTitle,
	Description: PopoverDescription,
})

export { Popover }
