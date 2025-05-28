import { Tooltip as ArkTooltip } from "@ark-ui/solid"
import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

type TooltipProps = ComponentProps<typeof ArkTooltip.Root> & {
	offset?: number
}

const TooltipRoot: Component<TooltipProps> = (props) => {
	const [local, rootProps] = splitProps(props, ["offset"])
	const positioningOptions = () => ({
		offset: { mainAxis: local.offset ?? 4, crossAxis: 0 },
	})

	return <ArkTooltip.Root positioning={positioningOptions()} {...rootProps} />
}

const TooltipTrigger = ArkTooltip.Trigger

type TooltipContentProps = ComponentProps<typeof ArkTooltip.Content>

const TooltipContent: Component<TooltipContentProps> = (props) => {
	const [local, contentProps] = splitProps(props, ["class"])

	return (
		<ArkTooltip.Positioner>
			<ArkTooltip.Content
				class={twMerge(
					// Base styles
					"z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs",
					// Animation styles using data-state provided by Ark UI
					"transition-all duration-150 ease-out",
					// State: Closed
					"data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
					// State: Open
					"data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
					// Optional: Add slide-in based on placement if needed and if animations are defined
					// Requires defining keyframes/animations like slide-in-from-top-2 etc.
					"data-[placement=bottom]:slide-in-from-top-2",
					"data-[placement=left]:slide-in-from-right-2",
					"data-[placement=right]:slide-in-from-left-2",
					"data-[placement=top]:slide-in-from-bottom-2",
					local.class, // Merge with user-provided classes
				)}
				{...contentProps}
			/>
		</ArkTooltip.Positioner>
	)
}

const TooltipProvider: Component<ComponentProps<typeof ArkTooltip.Root>> = (props) => {
	return <ArkTooltip.Root {...props} />
}

export const Tooltip = Object.assign(TooltipRoot, {
	Trigger: TooltipTrigger,
	Content: TooltipContent,
	Provider: TooltipProvider,
})
