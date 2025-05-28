import { Menu as ArkMenu } from "@ark-ui/solid"
import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

const MenuRoot: Component<ComponentProps<typeof ArkMenu.Root>> = (props) => {
	return <ArkMenu.Root {...props} />
}

// Menu Trigger
const MenuTrigger = ArkMenu.Trigger

// Menu Content
type MenuContentProps = ComponentProps<typeof ArkMenu.Content>
const MenuContent: Component<MenuContentProps> = (props) => {
	const [local, contentProps] = splitProps(props, ["class"])
	return (
		<ArkMenu.Positioner>
			<ArkMenu.Content
				class={twMerge(
					// Base styles
					"z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
					// Animation styles
					"data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
					"data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
					// Placement adjustments (optional, requires defined animations)
					"data-[placement=bottom]:slide-in-from-top-2",
					"data-[placement=left]:slide-in-from-right-2",
					"data-[placement=right]:slide-in-from-left-2",
					"data-[placement=top]:slide-in-from-bottom-2",
					local.class,
				)}
				{...contentProps}
			/>
		</ArkMenu.Positioner>
	)
}

// Menu Item
type MenuItemProps = ComponentProps<typeof ArkMenu.Item>
const MenuItem: Component<MenuItemProps> = (props) => {
	const [local, itemProps] = splitProps(props, ["class", "children"])
	return (
		<ArkMenu.Item
			class={twMerge(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				local.class,
			)}
			{...itemProps}
		>
			{local.children}
		</ArkMenu.Item>
	)
}

// Menu Shortcut (Custom component)
const MenuShortcut: Component<ComponentProps<"span">> = (props) => {
	const [local, spanProps] = splitProps(props, ["class"])
	return <span class={twMerge("ml-auto text-muted-foreground text-xs tracking-widest", local.class)} {...spanProps} />
}

// Menu Label (using ItemGroupLabel)
type MenuLabelProps = ComponentProps<typeof ArkMenu.ItemGroupLabel>
const MenuLabel: Component<MenuLabelProps> = (props) => {
	const [local, labelProps] = splitProps(props, ["class"])
	return <ArkMenu.ItemGroupLabel class={twMerge("px-2 py-1.5 font-semibold text-sm", local.class)} {...labelProps} />
}

// Menu Separator
type MenuSeparatorProps = ComponentProps<typeof ArkMenu.Separator>
const MenuSeparator: Component<MenuSeparatorProps> = (props) => {
	const [local, separatorProps] = splitProps(props, ["class"])
	return <ArkMenu.Separator class={twMerge("-mx-1 my-1 h-px bg-muted", local.class)} {...separatorProps} />
}

// Menu Item Group
const MenuItemGroup = ArkMenu.ItemGroup

// Sub Menu Trigger (using TriggerItem)
type MenuSubTriggerProps = ComponentProps<typeof ArkMenu.TriggerItem>
const MenuSubTrigger: Component<MenuSubTriggerProps> = (props) => {
	const [local, triggerProps] = splitProps(props, ["class", "children"])
	return (
		<ArkMenu.TriggerItem
			class={twMerge(
				"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
				local.class,
			)}
			{...triggerProps}
		>
			{local.children}
			{/* Add ChevronRightIcon or similar indicator here if desired */}
			{/* <ChevronRightIcon class="ml-auto h-4 w-4" /> */}
		</ArkMenu.TriggerItem>
	)
}

// Sub Menu Content (using nested MenuContent)
type MenuSubContentProps = ComponentProps<typeof MenuContent> // Reuse MenuContent styling
const MenuSubContent: Component<MenuSubContentProps> = (props) => {
	const [local, contentProps] = splitProps(props, ["class"])
	return (
		// Ark UI handles portalling via Positioner
		<ArkMenu.Positioner>
			<ArkMenu.Content
				class={twMerge(
					// Base styles (same as MenuContent)
					"z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
					// Animation styles
					"data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
					"data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
					// Placement adjustments (optional)
					"data-[placement=bottom]:slide-in-from-top-2",
					"data-[placement=left]:slide-in-from-right-2",
					"data-[placement=right]:slide-in-from-left-2",
					"data-[placement=top]:slide-in-from-bottom-2",
					local.class,
				)}
				{...contentProps}
			/>
		</ArkMenu.Positioner>
	)
}

const MenuSub = ArkMenu.Root

export const Menu = Object.assign(MenuRoot, {
	Trigger: MenuTrigger,
	Content: MenuContent,
	Item: MenuItem,
	Shortcut: MenuShortcut,
	Label: MenuLabel,
	Separator: MenuSeparator,
	ItemGroup: MenuItemGroup,
	Sub: MenuSub,
	SubTrigger: MenuSubTrigger,
	SubContent: MenuSubContent,
})
