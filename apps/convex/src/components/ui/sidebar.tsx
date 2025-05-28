import { Dialog as ArkDialog, type HTMLArkProps, ark } from "@ark-ui/solid" // Using Dialog for Sheet functionality
import { Tooltip as ArkTooltip } from "@ark-ui/solid"
import {
	type Accessor,
	type Component,
	type JSX,
	Match,
	type ParentProps,
	Show,
	Switch,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	splitProps,
	useContext,
} from "solid-js"
import { Portal } from "solid-js/web"
import { type VariantProps, tv } from "tailwind-variants"

// Assuming lucide-solid or similar setup
import { IconSidebarLeftArrow } from "~/components/icons/sidebar-left-arrow" // Assuming this icon exists

import { Button, type ButtonProps } from "~/components/ui/button" // Assuming Button exists
import { Separator } from "~/components/ui/separator"
import { TextField, type TextFieldProps } from "~/components/ui/text-field" // Assuming TextField exists for Input
import {/* TooltipContentProps */} from "~/components/ui/tooltip"
import { cn } from "~/lib/utils" // Assuming cn utility exists

// Basic Skeleton implementation if not found elsewhere
const Skeleton: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div class={cn("animate-pulse rounded-md bg-muted", local.class)} {...rest} />
}

import { makeMediaQueryListener } from "@solid-primitives/media"

// Placeholder for useIsMobile - replace with actual implementation if available
// e.g., using import { useMediaQuery } from "@solid-primitives/media";
const useIsMobile = (): Accessor<boolean> => {
	if (typeof window === "undefined") {
		return () => false // Default value for SSR
	}
	const [isMobile, setIsMobile] = createSignal(window.matchMedia("(max-width: 768px)").matches)

	makeMediaQueryListener("(max-width: 768px)", (e) => {
		setIsMobile(e.matches)
	})

	return isMobile
}

// --- Constants ---
const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

// --- Context ---
type SidebarContextProps = {
	state: Accessor<"expanded" | "collapsed">
	open: Accessor<boolean>
	setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
	openMobile: Accessor<boolean>
	setOpenMobile: (open: boolean | ((prev: boolean) => boolean)) => void
	isMobile: Accessor<boolean>
	toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

const useSidebar = () => {
	const context = useContext(SidebarContext)
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.")
	}
	return context
}

// --- Provider ---
type SidebarProviderProps = ParentProps<{
	defaultOpen?: boolean
	open?: Accessor<boolean>
	onOpenChange?: (open: boolean) => void
	class?: string
	style?: JSX.CSSProperties | string
}>

const SidebarProvider: Component<SidebarProviderProps> = (props) => {
	const [local, rest] = splitProps(props, ["defaultOpen", "open", "onOpenChange", "class", "style", "children"])

	const isMobile = useIsMobile()
	const [openMobile, setOpenMobile] = createSignal(false)

	// Internal state if not controlled
	const [_open, _setOpen] = createSignal(local.defaultOpen ?? true)

	// Determine controlled vs uncontrolled state
	const open = createMemo(() => local.open?.() ?? _open())
	const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
		const openState = typeof value === "function" ? value(open()) : value
		if (local.onOpenChange) {
			local.onOpenChange(openState)
		} else {
			_setOpen(openState)
		}

		if (typeof document !== "undefined") {
			document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
		}
	}

	const toggleSidebar = () => {
		isMobile() ? setOpenMobile((o) => !o) : setOpen((o) => !o)
	}

	// Keyboard shortcut effect
	createEffect(() => {
		if (typeof window === "undefined") return
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				toggleSidebar()
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
	})

	const state = createMemo(() => (open() ? "expanded" : "collapsed"))

	const contextValue: SidebarContextProps = {
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar,
	}

	// CSS Variables need careful handling in SolidJS style prop
	const sidebarStyle = createMemo(() => {
		const baseStyle = {
			"--sidebar-width": SIDEBAR_WIDTH,
			"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
		}

		return { ...baseStyle }
	})

	return (
		<SidebarContext.Provider value={contextValue}>
			<ArkTooltip.Root>
				{/* Provider equivalent */}
				<div
					style={sidebarStyle()}
					class={cn(
						"group/sidebar-wrapper flex min-h-svh w-full has-[data-variant=inset]:bg-sidebar",
						local.class,
					)}
					{...rest}
				>
					{local.children}
				</div>
			</ArkTooltip.Root>
		</SidebarContext.Provider>
	)
}

// --- Sidebar Component ---
type SidebarProps = ParentProps<{
	side?: "left" | "right"
	variant?: "sidebar" | "floating" | "inset"
	collapsible?: "offcanvas" | "icon" | "none"
	class?: string
}>

const SidebarRoot: Component<SidebarProps> = (props) => {
	const [local, rest] = splitProps(props, ["side", "variant", "collapsible", "class", "children"])
	const side = createMemo(() => local.side ?? "left")
	const variant = createMemo(() => local.variant ?? "sidebar")
	const collapsible = createMemo(() => local.collapsible ?? "offcanvas")

	const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

	// Style for Mobile Dialog/Sheet
	const mobileSheetStyle = {
		"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
	}

	return (
		<Switch>
			{/* Non-collapsible */}
			<Match when={collapsible() === "none"}>
				<div
					class={cn(
						"flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground",
						local.class,
					)}
					{...rest}
				>
					{local.children}
				</div>
			</Match>

			{/* Mobile Sheet (using Dialog) */}
			<Match when={collapsible() !== "none" && isMobile()}>
				<ArkDialog.Root open={openMobile()} onOpenChange={(detail) => setOpenMobile(detail.open)}>
					<Portal>
						{" "}
						{/* Ensure dialog renders at top level */}
						<ArkDialog.Backdrop class="fixed inset-0 z-40 bg-black/50" />
						<ArkDialog.Positioner class="fixed inset-0 z-50 flex">
							<ArkDialog.Content
								data-sidebar="sidebar"
								data-mobile="true"
								class={cn(
									"z-50 flex h-full flex-col border-border bg-sidebar p-0 text-sidebar-foreground shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in",
									side() === "left"
										? "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left border-r"
										: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right border-l",
									"w-[var(--sidebar-width)]", // Use var directly
								)}
								style={mobileSheetStyle} // Apply specific width
							>
								{/* Add Close Trigger if needed */}
								{/* <ArkDialog.CloseTrigger class="absolute top-4 right-4">X</ArkDialog.CloseTrigger> */}
								<ArkDialog.Title class="sr-only">Sidebar</ArkDialog.Title>
								<ArkDialog.Description class="sr-only">
									Displays the mobile sidebar.
								</ArkDialog.Description>
								<div class="flex h-full w-full flex-col">{local.children}</div>
							</ArkDialog.Content>
						</ArkDialog.Positioner>
					</Portal>
				</ArkDialog.Root>
			</Match>

			{/* Desktop Sidebar */}
			<Match when={collapsible() !== "none" && !isMobile()}>
				<div
					class="group peer hidden text-sidebar-foreground md:block"
					data-state={state()}
					data-collapsible={state() === "collapsed" ? collapsible() : ""}
					data-variant={variant()}
					data-side={side()}
				>
					{/* Desktop Gap Handler */}
					<div
						class={cn(
							"relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear",
							"group-data-[collapsible=offcanvas]:w-0",
							"group-data-[side=right]:rotate-180",
							variant() === "floating" || variant() === "inset"
								? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
								: "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
						)}
					/>
					{/* Desktop Content Container */}
					<div
						class={cn(
							"fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
							side() === "left"
								? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
								: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
							variant() === "floating" || variant() === "inset"
								? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
								: "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
							local.class,
						)}
						{...rest}
					>
						<div
							data-sidebar="sidebar"
							class={cn(
								"flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow",
							)}
						>
							{local.children}
						</div>
					</div>
				</div>
			</Match>
		</Switch>
	)
}

// --- Trigger ---
const SidebarTrigger: Component<ButtonProps> = (props) => {
	const [local, rest] = splitProps(props, ["class", "onClick"])
	const { toggleSidebar } = useSidebar()

	const handleClick = (event: MouseEvent & { currentTarget: HTMLButtonElement; target: Element }) => {
		if (local.onClick && typeof local.onClick === "function") {
			;(local.onClick as (e: MouseEvent) => void)(event)
		}
		toggleSidebar()
	}

	return (
		<Button
			data-sidebar="trigger"
			intent="ghost"
			size="icon"
			class={cn("h-7 w-7", local.class)}
			onClick={handleClick}
			{...rest}
		>
			<IconSidebarLeftArrow />
			<span class="sr-only">Toggle Sidebar</span>
		</Button>
	)
}

// --- Rail ---
const SidebarRail: Component<JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	const { toggleSidebar } = useSidebar()

	return (
		<button
			data-sidebar="rail"
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			title="Toggle Sidebar"
			class={cn(
				"-translate-x-1/2 group-data-[side=left]:-right-4 absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=right]:left-0 sm:flex",
				"[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				"group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:hover:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full",
				"[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
				"[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Inset ---
const SidebarInset: Component<JSX.HTMLAttributes<HTMLElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return (
		<main
			class={cn(
				"relative flex w-full flex-1 flex-col bg-background",
				"md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Input (using TextField) ---
const SidebarInput: Component<TextFieldProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <TextField data-sidebar="input" class={cn("h-8 w-full bg-background shadow-none", local.class)} {...rest} />
}

// --- Header ---
const SidebarHeader: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div data-sidebar="header" class={cn("flex flex-col gap-2 p-2", local.class)} {...rest} />
}

// --- Footer ---
const SidebarFooter: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div data-sidebar="footer" class={cn("flex flex-col gap-2 p-2", local.class)} {...rest} />
}

// --- Separator ---
const SidebarSeparator: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <Separator data-sidebar="separator" class={cn("mx-2 w-auto bg-sidebar-border", local.class)} {...rest} />
}

// --- Content ---
const SidebarContent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return (
		<div
			data-sidebar="content"
			class={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Group ---
const SidebarGroup: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div data-sidebar="group" class={cn("relative flex w-full min-w-0 flex-col p-2", local.class)} {...rest} />
}

// --- Group Label ---
const SidebarGroupLabel: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return (
		<div
			data-sidebar="group-label"
			class={cn(
				"flex h-8 shrink-0 items-center rounded-md px-2 font-medium text-sidebar-foreground/70 text-xs outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
				"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Group Action ---
const SidebarGroupAction: Component<JSX.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return (
		<button
			data-sidebar="group-action"
			class={cn(
				"absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
				"after:-inset-2 after:absolute after:md:hidden", // Mobile hit area
				"group-data-[collapsible=icon]:hidden",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Group Content ---
const SidebarGroupContent: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div data-sidebar="group-content" class={cn("w-full text-sm", local.class)} {...rest} />
}

// --- Menu ---
const SidebarMenu: Component<JSX.HTMLAttributes<HTMLUListElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <ul data-sidebar="menu" class={cn("flex w-full min-w-0 flex-col gap-1", local.class)} {...rest} />
}

// --- Menu Item ---
const SidebarMenuItem: Component<JSX.HTMLAttributes<HTMLLIElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <li data-sidebar="menu-item" class={cn("group/menu-item relative", local.class)} {...rest} />
}

// --- Menu Button Variants (using tailwind-variants) ---
const sidebarMenuButtonVariants = tv({
	base: "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-muted hover:text-muted-foreground focus-visible:ring-2 active:bg-muted active:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
	variants: {
		variant: {
			default: "hover:bg-muted hover:text-muted-foreground",
			outline:
				"bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
		},
		size: {
			default: "h-8 text-sm",
			sm: "h-7 text-xs",
			lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
})

// --- Menu Button ---
type SidebarMenuButtonProps = HTMLArkProps<"button"> &
	VariantProps<typeof sidebarMenuButtonVariants> & {
		isActive?: Accessor<boolean>
		tooltip?: string | any // Using any for ArkTooltipContentProps - Please refine!
	}

const SidebarMenuButton: Component<SidebarMenuButtonProps> = (props) => {
	const [local, rest] = splitProps(props, ["isActive", "variant", "size", "tooltip", "class"])
	const { isMobile, state } = useSidebar()

	const buttonElement = (
		<ark.button
			data-sidebar="menu-button"
			data-size={local.size}
			data-active={local.isActive?.()}
			class={sidebarMenuButtonVariants({ variant: local.variant, size: local.size, class: local.class })}
			{...rest}
		/>
	)

	return (
		<Show when={local.tooltip} fallback={buttonElement}>
			<ArkTooltip.Root>
				<ArkTooltip.Trigger>{buttonElement}</ArkTooltip.Trigger>
				<Portal>
					<ArkTooltip.Positioner>
						<ArkTooltip.Content
							side="right"
							align="center"
							{...(typeof local.tooltip === "string" ? {} : local.tooltip)}
							class={cn(
								(typeof local.tooltip === "object" && local.tooltip?.class) || "",
								state() !== "collapsed" || isMobile() ? "hidden" : "",
							)}
						>
							{typeof local.tooltip === "string" ? local.tooltip : local.tooltip?.children}
						</ArkTooltip.Content>
					</ArkTooltip.Positioner>
				</Portal>
			</ArkTooltip.Root>
		</Show>
	)
}

// --- Menu Action ---
type SidebarMenuActionProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
	showOnHover?: boolean
}

const SidebarMenuAction: Component<SidebarMenuActionProps> = (props) => {
	const [local, rest] = splitProps(props, ["class", "showOnHover"])
	return (
		<button
			data-sidebar="menu-action"
			class={cn(
				"absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
				"after:-inset-2 after:absolute after:md:hidden",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				local.showOnHover &&
					"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Menu Badge ---
const SidebarMenuBadge: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return (
		<div
			data-sidebar="menu-badge"
			class={cn(
				"pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 font-medium text-sidebar-foreground text-xs tabular-nums",
				"peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Menu Skeleton ---
const SidebarMenuSkeleton: Component<JSX.HTMLAttributes<HTMLDivElement> & { showIcon?: boolean }> = (props) => {
	const [local, rest] = splitProps(props, ["class", "showIcon"])

	// Random width for skeleton text
	const width = createMemo(() => `${Math.floor(Math.random() * 40) + 50}%`)

	const skeletonStyle = createMemo(() => ({
		"--skeleton-width": width(),
	}))

	return (
		<div
			data-sidebar="menu-skeleton"
			class={cn("flex h-8 items-center gap-2 rounded-md px-2", local.class)}
			{...rest}
		>
			<Show when={local.showIcon}>
				<Skeleton class="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
			</Show>
			<Skeleton
				class="h-4 max-w-[var(--skeleton-width)] flex-1"
				data-sidebar="menu-skeleton-text"
				style={skeletonStyle()}
			/>
		</div>
	)
}

// --- Menu Sub ---
const SidebarMenuSub: Component<JSX.HTMLAttributes<HTMLUListElement>> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return (
		<ul
			data-sidebar="menu-sub"
			class={cn(
				"mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l px-2.5 py-0.5",
				"group-data-[collapsible=icon]:hidden",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Menu Sub Item ---
const SidebarMenuSubItem: Component<JSX.HTMLAttributes<HTMLLIElement>> = (props) => {
	// No extra logic, just pass props
	return <li {...props} />
}

// --- Menu Sub Button ---
type SidebarMenuSubButtonProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
	size?: "sm" | "md"
	isActive?: boolean
}

const SidebarMenuSubButton: Component<SidebarMenuSubButtonProps> = (props) => {
	const [local, rest] = splitProps(props, ["size", "isActive", "class"])
	const size = createMemo(() => local.size ?? "md")
	return (
		<a
			data-sidebar="menu-sub-button"
			data-size={size()}
			data-active={local.isActive}
			class={cn(
				"-translate-x-px flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
				"data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
				size() === "sm" && "text-xs",
				size() === "md" && "text-sm",
				"group-data-[collapsible=icon]:hidden",
				local.class,
			)}
			{...rest}
		/>
	)
}

// --- Exports ---
export {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
	type SidebarProps,
	type SidebarProviderProps,
}

export const Sidebar = Object.assign(SidebarRoot, {
	Group: SidebarGroup,
	GroupLabel: SidebarGroupLabel,
	GroupAction: SidebarGroupAction,
	GroupContent: SidebarGroupContent,
	Menu: SidebarMenu,
	MenuAction: SidebarMenuAction,
	MenuBadge: SidebarMenuBadge,
	MenuButton: SidebarMenuButton,
	MenuItem: SidebarMenuItem,
	MenuSkeleton: SidebarMenuSkeleton,
	MenuSub: SidebarMenuSub,
	MenuSubButton: SidebarMenuSubButton,
	MenuSubItem: SidebarMenuSubItem,
	Input: SidebarInput,
	Header: SidebarHeader,
	Footer: SidebarFooter,
	Separator: SidebarSeparator,
	Content: SidebarContent,
	Trigger: SidebarTrigger,
	Rail: SidebarRail,
	Inset: SidebarInset,

	Provider: SidebarProvider,
})
