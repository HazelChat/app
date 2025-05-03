import { Listbox as ArkListbox } from "@ark-ui/solid"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { IconCheck } from "../icons/check"

const ListboxRoot = <T,>(props: ArkListbox.RootProps<T>) => {
	const [local, rootProps] = splitProps(props, ["class"])
	return (
		<ArkListbox.Root
			asChild={(props) => <div class={twMerge("flex flex-col gap-2", local.class)} {...props} />}
			{...rootProps}
		/>
	)
}

const ListboxLabel = (props: ArkListbox.LabelProps) => {
	const [local, labelProps] = splitProps(props, ["class"])
	return (
		<ArkListbox.Label
			class={twMerge("block font-medium text-muted-foreground text-sm leading-none tracking-tight", local.class)}
			{...labelProps}
		/>
	)
}

const ListboxContent = (props: ArkListbox.ContentProps) => {
	const [local, contentProps] = splitProps(props, ["class"])
	return (
		<ArkListbox.Content
			class={twMerge("flex flex-col rounded-md border px-1 py-1", local.class)}
			{...contentProps}
		/>
	)
}

const ListboxItem = (props: ArkListbox.ItemProps & { item: any }) => {
	const [local, itemProps] = splitProps(props, ["class"])
	return (
		<ArkListbox.Item
			class={twMerge(
				"relative flex cursor-default select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-highlighted:bg-accent data-[disabled]:opacity-50",
				local.class,
			)}
			{...itemProps}
		/>
	)
}

const ListboxItemText = (props: ArkListbox.ItemTextProps) => {
	const [local, itemTextProps] = splitProps(props, ["class"])
	return (
		<ArkListbox.ItemText
			class={twMerge("font-normal text-base text-foreground leading-none tracking-tight", local.class)}
			{...itemTextProps}
		/>
	)
}

const ListboxItemIndicator = (props: ArkListbox.ItemIndicatorProps) => {
	return (
		<ArkListbox.ItemIndicator {...props}>
			<IconCheck class="size-3 text-primary" />
		</ArkListbox.ItemIndicator>
	)
}

export const ListBox = Object.assign(ListboxRoot, {
	Content: ListboxContent,
	Item: ListboxItem,
	Label: ListboxLabel,
	ItemText: ListboxItemText,
	ItemIndicator: ListboxItemIndicator,
})
