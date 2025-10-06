"use client"

import { cva } from "class-variance-authority"
import { createContext, use, useEffect } from "react"
import {
	Autocomplete,
	type AutocompleteProps,
	Button,
	Collection,
	type CollectionRenderer,
	CollectionRendererContext,
	composeRenderProps,
	DefaultCollectionRenderer,
	Dialog,
	Header,
	Input,
	MenuItem,
	Menu as MenuPrimitive,
	type MenuProps,
	MenuSection,
	type MenuSectionProps,
	type MenuTriggerProps,
	Modal,
	ModalContext,
	ModalOverlay,
	OverlayTriggerStateContext,
	SearchField,
	type SearchFieldProps,
	Text,
	type TextProps,
	useFilter,
} from "react-aria-components"
import { twJoin, twMerge } from "tailwind-merge"
import { Keyboard } from "~/components/ui/keyboard"
import { Separator } from "~/components/ui/separator"
import { composeTailwindRenderProps } from "~/lib/primitive"
import IconMagnifier3 from "../icons/icon-magnifier-3"
import { Loader } from "./loader"

interface CommandMenuProviderProps {
	isPending?: boolean
	escapeButton?: boolean
}

const CommandMenuContext = createContext<CommandMenuProviderProps | undefined>(undefined)

const useCommandMenu = () => {
	const context = use(CommandMenuContext)

	if (!context) {
		throw new Error("useCommandMenu must be used within a <CommandMenuProvider />")
	}

	return context
}

const sizes = {
	xs: "sm:max-w-xs",
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	"2xl": "sm:max-w-2xl",
	"3xl": "sm:max-w-3xl",
}

interface CommandMenuProps extends AutocompleteProps, MenuTriggerProps, CommandMenuProviderProps {
	isDismissable?: boolean
	"aria-label"?: string
	shortcut?: string
	isBlurred?: boolean
	className?: string
	size?: keyof typeof sizes
}

const CommandMenu = ({
	onOpenChange,
	className,
	isDismissable = true,
	escapeButton = true,
	isPending,
	size = "xl",
	isBlurred,
	shortcut,
	...props
}: CommandMenuProps) => {
	const { contains } = useFilter({ sensitivity: "base" })
	const filter = (textValue: string, inputValue: string) => contains(textValue, inputValue)
	useEffect(() => {
		if (!shortcut) return

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === shortcut && (e.metaKey || e.ctrlKey)) {
				onOpenChange?.(true)
			}
		}

		document.addEventListener("keydown", onKeyDown)
		return () => document.removeEventListener("keydown", onKeyDown)
	}, [shortcut, onOpenChange])
	return (
		<CommandMenuContext value={{ isPending: isPending, escapeButton: escapeButton }}>
			<ModalContext value={{ isOpen: props.isOpen, onOpenChange: onOpenChange }}>
				<ModalOverlay
					isDismissable={isDismissable}
					className={({ isExiting, isEntering }) =>
						twJoin(
							"fixed inset-0 z-50 h-(--visual-viewport-height,100vh) w-screen overflow-hidden bg-black/15",
							"grid grid-rows-[1fr_auto] justify-items-center text-center sm:grid-rows-[1fr_auto_3fr]",
							isEntering && "fade-in animate-in duration-300",
							isExiting && "fade-out animate-out duration-200",
							isBlurred && "backdrop-blur-sm",
						)
					}
					{...props}
				>
					<Modal
						className={({ isExiting, isEntering }) =>
							twMerge(
								"row-start-2 bg-primary text-left text-primary shadow-lg outline-none ring ring-primary md:row-start-1",
								"sm:-translate-x-1/2 max-h-[calc(var(--visual-viewport-height)*0.8)] w-full sm:fixed sm:top-[10%] sm:left-1/2",
								"rounded-t-2xl md:rounded-xl",
								isEntering && [
									"slide-in-from-bottom animate-in duration-300 ease-out",
									"md:fade-in md:zoom-in-95 md:slide-in-from-bottom-0",
								],
								isExiting && [
									"slide-out-to-bottom animate-out",
									"md:fade-out md:zoom-out-95 md:slide-out-to-bottom-0",
								],
								sizes[size],
								className,
							)
						}
					>
						<Dialog
							aria-label={props["aria-label"] ?? "Command Menu"}
							className="flex max-h-[inherit] flex-col overflow-hidden outline-hidden"
						>
							<Autocomplete filter={filter} {...props} />
						</Dialog>
					</Modal>
				</ModalOverlay>
			</ModalContext>
		</CommandMenuContext>
	)
}

interface CommandMenuSearchProps extends SearchFieldProps {
	placeholder?: string
	className?: string
}

const CommandMenuSearch = ({ className, placeholder, ...props }: CommandMenuSearchProps) => {
	const state = use(OverlayTriggerStateContext)!
	const { isPending, escapeButton } = useCommandMenu()
	return (
		<SearchField
			aria-label="Quick search"
			autoFocus
			className={composeTailwindRenderProps(className, "flex w-full items-center px-2.5 py-1")}
			{...props}
		>
			{isPending ? (
				<Loader className="size-4.5" variant="spin" />
			) : (
				<IconMagnifier3
					data-slot="command-menu-search-icon"
					className="size-5 shrink-0 text-tertiary"
				/>
			)}
			<Input
				placeholder={placeholder ?? "Search..."}
				className="w-full min-w-0 bg-transparent px-2.5 py-2 text-base text-fg placeholder-muted-fg outline-hidden focus:outline-hidden sm:px-2 sm:py-1.5 sm:text-sm [&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden"
			/>
			{escapeButton && (
				<Button
					onPress={() => state?.close()}
					className="hidden cursor-default rounded border border-primary hover:bg-tertiary lg:inline lg:px-1.5 lg:py-0.5 lg:text-xs"
				>
					Esc
				</Button>
			)}
		</SearchField>
	)
}

const CommandMenuList = <T extends object>({ className, ...props }: MenuProps<T>) => {
	return (
		<CollectionRendererContext.Provider value={renderer}>
			<MenuPrimitive
				className={composeTailwindRenderProps(
					className,
					"grid max-h-full flex-1 grid-cols-[auto_1fr] content-start overflow-y-auto border-primary border-t p-2 sm:max-h-110 *:[[role=group]]:mb-6 *:[[role=group]]:last:mb-0",
				)}
				{...props}
			/>
		</CollectionRendererContext.Provider>
	)
}

interface CommandMenuSectionProps<T> extends MenuSectionProps<T> {
	label?: string
}
const CommandMenuSection = <T extends object>({ className, ...props }: CommandMenuSectionProps<T>) => {
	return (
		<MenuSection
			className={twMerge(
				"col-span-full grid grid-cols-[auto_1fr] content-start gap-y-[calc(var(--spacing)*0.25)]",
				className,
			)}
			{...props}
		>
			{"label" in props && (
				<Header className="col-span-full mb-1 block min-w-(--trigger-width) truncate px-2.5 text-muted-fg text-xs">
					{props.label}
				</Header>
			)}
			<Collection items={props.items}>{props.children}</Collection>
		</MenuSection>
	)
}

const commandMenuItem = cva(
	[
		"[--mr-icon:--spacing(2)] sm:[--mr-icon:--spacing(1.5)]",
		"col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] px-3 py-2 supports-[grid-template-columns:subgrid]:grid-cols-subgrid sm:px-2.5 sm:py-1.5",
		"not-has-[[slot=description]]:items-center has-[[slot=description]]:**:data-[slot=check-indicator]:mt-[1.5px]",
		"group relative cursor-default select-none rounded-[calc(var(--radius-lg)-1px)] text-base/6 text-fg outline-0 sm:text-sm/6",
		"**:data-[slot=avatar]:*:mr-1.5 **:data-[slot=avatar]:*:size-6 **:data-[slot=avatar]:mr-(--mr-icon) **:data-[slot=avatar]:size-6 sm:**:data-[slot=avatar]:*:size-5 sm:**:data-[slot=avatar]:size-5",
		"*:[svg]:mr-(--mr-icon) **:[svg]:size-5 **:[svg]:shrink-0 **:[svg]:text-tertiary sm:**:[svg]:size-4",
		"[&>[slot=label]+[svg]]:absolute [&>[slot=label]+[svg]]:right-1",
		"data-danger:text-danger data-danger:**:[svg]:text-danger/60",
		"forced-color-adjust-none forced-colors:text-[CanvasText] forced-colors:**:[svg]:text-[CanvasText] forced-colors:group-focus:**:[svg]:text-[CanvasText]",
	],
	{
		variants: {
			isDisabled: {
				true: "opacity-50 forced-colors:text-[GrayText]",
			},
			isSelected: {
				true: "**:data-[slot=avatar]:*:hidden **:data-[slot=avatar]:hidden **:[svg]:hidden **:[svg]:text-accent-fg",
			},
			isDanger: {
				true: [
					"text-danger focus:text-danger **:[svg]:text-danger/70 focus:**:[svg]:text-danger",
					"focus:*:[[slot=description]]:text-danger/80 focus:*:[[slot=label]]:text-danger",
					"focus:bg-danger/10 focus:text-danger focus:**:[svg]:text-danger forced-colors:focus:text-[Mark]",
				],
			},
			isFocused: {
				true: [
					"**:[svg]:text-primary **:[kbd]:text-accent-fg",
					"bg-tertiary forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
					"[&_.text-muted-fg]:text-accent-fg/80 *:[[slot=description]]:text-accent-fg *:[[slot=label]]:text-accent-fg",
				],
			},
			isHovered: {
				true: [
					"**:[svg]:text-accent-fg **:[kbd]:text-accent-fg",
					"bg-accent text-accent-fg forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
					"[&_.text-muted-fg]:text-accent-fg/80 *:[[slot=description]]:text-accent-fg *:[[slot=label]]:text-accent-fg",
				],
			},
		},
	},
)

const CommandMenuItem = ({ className, ...props }: React.ComponentProps<typeof MenuItem>) => {
	const textValue = props.textValue || (typeof props.children === "string" ? props.children : undefined)
	return (
		<MenuItem
			{...props}
			textValue={textValue}
			className={composeRenderProps(className, (className, { hasSubmenu, ...renderProps }) =>
				commandMenuItem({
					...renderProps,
					className,
				}),
			)}
		/>
	)
}

const CommandMenuDescription = ({ className, ...props }: TextProps) => {
	return (
		<Text
			slot="description"
			className={twMerge(
				"col-start-3 row-start-1 ml-auto font-normal text-muted-fg text-sm",
				className,
			)}
			{...props}
		/>
	)
}

const renderer: CollectionRenderer = {
	CollectionRoot(props) {
		if (props.collection.size === 0) {
			return (
				<div className="col-span-full p-4 text-center text-muted-fg text-sm">No results found.</div>
			)
		}
		return <DefaultCollectionRenderer.CollectionRoot {...props} />
	},
	CollectionBranch: DefaultCollectionRenderer.CollectionBranch,
}

const CommandMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof Separator>) => (
	<Separator
		orientation="horizontal"
		className={twMerge("-mx-2 col-span-full my-1 h-px bg-fg/10", className)}
		{...props}
	/>
)

const CommandMenuFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			className={twMerge(
				"col-span-full flex-none border-t px-2 py-1.5 text-muted-fg text-sm",
				"*:[kbd]:inset-ring *:[kbd]:inset-ring-fg/10 *:[kbd]:mx-1 *:[kbd]:inline-grid *:[kbd]:h-4 *:[kbd]:min-w-4 *:[kbd]:place-content-center *:[kbd]:rounded-xs *:[kbd]:bg-secondary",
				className,
			)}
			{...props}
		/>
	)
}

const CommandMenuLabel = ({ className, ...props }: TextProps) => {
	return <Text slot="label" className={twMerge("col-start-2", className)} {...props} />
}
const CommandMenuShortcut = ({ className, ...props }: React.ComponentProps<typeof Keyboard>) => (
	<Keyboard
		classNames={{
			base: twMerge(
				"absolute right-2 pl-2 group-hover:text-primary group-focus:text-primary",
				"gap-0.5 font-sans text-[10.5px] uppercase *:inset-ring *:inset-ring-secondary group-focus:*:inset-ring-primary *:grid *:size-5.5 *:place-content-center *:rounded-xs *:bg-tertiary",
			),
		}}
		{...props}
	/>
)

export type { CommandMenuProps, CommandMenuSearchProps }
export {
	CommandMenu,
	CommandMenuSearch,
	CommandMenuList,
	CommandMenuItem,
	CommandMenuLabel,
	CommandMenuSection,
	CommandMenuDescription,
	CommandMenuShortcut,
	CommandMenuSeparator,
	CommandMenuFooter,
}
