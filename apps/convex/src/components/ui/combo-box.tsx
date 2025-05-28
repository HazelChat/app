import { Combobox as ArkCombobox } from "@ark-ui/solid"
import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { IconCheck } from "../icons/check"

const ComboboxRoot: Component<ComponentProps<typeof ArkCombobox.Root>> = (props) => {
	return <ArkCombobox.Root {...props} />
}

const ComboboxLabel = ArkCombobox.Label

type ComboboxControlProps = ComponentProps<typeof ArkCombobox.Control>
const ComboboxControl: Component<ComboboxControlProps> = (props) => {
	const [local, controlProps] = splitProps(props, ["class"])
	return <ArkCombobox.Control class={twMerge("relative", local.class)} {...controlProps} />
}

type ComboboxInputProps = ComponentProps<typeof ArkCombobox.Input>
const ComboboxInput: Component<ComboboxInputProps> = (props) => {
	const [local, inputProps] = splitProps(props, ["class"])
	return (
		<ArkCombobox.Input
			class={twMerge(
				// Mimic Button styles + input specifics
				"flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground",
				"focus:outline-none focus:ring-1 focus:ring-ring",
				"disabled:cursor-not-allowed disabled:opacity-50",
				// Adjust padding to accommodate trigger button if placed inside
				"pr-8", // Example padding if trigger is absolute positioned inside
				local.class,
			)}
			{...inputProps}
		/>
	)
}

// Combobox Trigger (usually the dropdown arrow)
type ComboboxTriggerProps = ComponentProps<typeof ArkCombobox.Trigger>
const ComboboxTrigger: Component<ComboboxTriggerProps> = (props) => {
	const [local, triggerProps] = splitProps(props, ["class", "children"])
	return (
		<ArkCombobox.Trigger
			class={twMerge("-translate-y-1/2 absolute top-1/2 right-2", local.class)}
			{...triggerProps}
		>
			{local.children}
		</ArkCombobox.Trigger>
	)
}

type ComboboxContentProps = ComponentProps<typeof ArkCombobox.Content>
const ComboboxContent: Component<ComboboxContentProps> = (props) => {
	const [local, contentProps] = splitProps(props, ["class"])
	return (
		<ArkCombobox.Positioner>
			<ArkCombobox.Content
				class={twMerge(
					// Mimic PopoverContent styles
					"relative z-50 max-h-[300px] w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
					// Mimic CommandList styles (padding)
					"p-1",
					// Animation
					"data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
					"data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
					local.class,
				)}
				{...contentProps}
			/>
		</ArkCombobox.Positioner>
	)
}

type ComboboxItemProps = ComponentProps<typeof ArkCombobox.Item>
const ComboboxItem: Component<ComboboxItemProps> = (props) => {
	const [local, itemProps] = splitProps(props, ["class", "children"])
	return (
		<ArkCombobox.Item
			class={twMerge(
				// Mimic CommandItem styles
				"relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
				// Highlight/Focus state from Ark UI
				"data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
				"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				local.class,
			)}
			{...itemProps}
		>
			{local.children}
		</ArkCombobox.Item>
	)
}

const ComboboxItemText = (props: ArkCombobox.ItemTextProps) => {
	const [local, itemTextProps] = splitProps(props, ["class"])
	return (
		<ArkCombobox.ItemText
			class={twMerge("font-normal text-base text-foreground leading-none tracking-tight", local.class)}
			{...itemTextProps}
		/>
	)
}

// Combobox Item Group
const ComboboxItemGroup = ArkCombobox.ItemGroup

// Combobox Item Group Label (Optional)
const ComboboxItemGroupLabel = ArkCombobox.ItemGroupLabel

// Custom component for Empty state (mimics CommandEmpty)
type ComboboxEmptyProps = ComponentProps<"div">
const ComboboxEmpty: Component<ComboboxEmptyProps> = (props) => {
	const [local, divProps] = splitProps(props, ["class"])
	return <div class={twMerge("py-6 text-center text-sm", local.class)} {...divProps} />
}

const ComboboxItemIndicator = (props: ArkCombobox.ItemIndicatorProps) => {
	return (
		<ArkCombobox.ItemIndicator {...props}>
			<IconCheck class="size-3 text-primary" />
		</ArkCombobox.ItemIndicator>
	)
}

const Combobox = Object.assign(ComboboxRoot, {
	Content: ComboboxContent,
	Label: ComboboxLabel,
	Control: ComboboxControl,
	Input: ComboboxInput,
	Trigger: ComboboxTrigger,
	Item: ComboboxItem,
	ItemText: ComboboxItemText,
	ItemGroup: ComboboxItemGroup,
	ItemGroupLabel: ComboboxItemGroupLabel,
	Empty: ComboboxEmpty,
	ItemIndicator: ComboboxItemIndicator,
})

export { Combobox }
