import { Tabs as ArkTabs } from "@ark-ui/solid"
import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

// Tabs Root Component
const TabsRoot: Component<ComponentProps<typeof ArkTabs.Root>> = (props) => {
	return <ArkTabs.Root {...props} />
}

// Tabs List Component
type TabsListProps = ComponentProps<typeof ArkTabs.List>
const TabsList: Component<TabsListProps> = (props) => {
	const [local, listProps] = splitProps(props, ["class"])
	return (
		<ArkTabs.List
			class={twMerge(
				// Base styles from original
				"inline-flex h-9 items-center justify-center rounded-lg bg-transparent py-1 text-muted-foreground",
				// User-provided classes
				local.class,
			)}
			{...listProps}
		/>
	)
}

// Tabs Trigger Component
type TabsTriggerProps = ComponentProps<typeof ArkTabs.Trigger>
const TabsTrigger: Component<TabsTriggerProps> = (props) => {
	const [local, triggerProps] = splitProps(props, ["class"])
	return (
		<ArkTabs.Trigger
			class={twMerge(
				// Base styles from original
				"inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 font-medium text-sm ring-offset-background transition-all",
				// Focus visible styles
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				// Disabled styles
				"disabled:pointer-events-none disabled:opacity-50",
				// Active styles
				"data-selected:bg-muted data-selected:text-foreground",
				// User-provided classes
				local.class,
			)}
			{...triggerProps}
		/>
	)
}

// Tabs Content Component
type TabsContentProps = ComponentProps<typeof ArkTabs.Content>
const TabsContent: Component<TabsContentProps> = (props) => {
	const [local, contentProps] = splitProps(props, ["class"])
	return (
		<ArkTabs.Content
			class={twMerge(
				// Base styles from original
				"mt-2 ring-offset-background",
				// Focus visible styles
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				// User-provided classes
				local.class,
			)}
			{...contentProps}
		/>
	)
}

export const Tabs = Object.assign(TabsRoot, {
	List: TabsList,
	Trigger: TabsTrigger,
	Content: TabsContent,
})
