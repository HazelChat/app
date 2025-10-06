"use client"

import { cva } from "class-variance-authority"
import * as React from "react"
import type {
	ButtonProps,
	DialogProps,
	DialogTriggerProps,
	HeadingProps,
	ModalOverlayProps,
	TextProps,
} from "react-aria-components"
import {
	Button,
	composeRenderProps,
	Dialog as DialogPrimitive,
	DialogTrigger as DialogTriggerPrimitive,
	Heading,
	Modal,
	ModalOverlay,
	Text,
} from "react-aria-components"
import { twJoin, twMerge } from "tailwind-merge"
import IconClose from "~/components/icons/icon-close"

type Sides = "top" | "bottom" | "left" | "right"

const generateCompoundVariants = (sides: Array<Sides>) => {
	return sides.map((side) => ({
		side,
		isFloat: true,
		className:
			side === "top"
				? "top-2 inset-x-2 rounded-lg ring-1 border-b-0"
				: side === "bottom"
					? "bottom-2 inset-x-2 rounded-lg ring-1 border-t-0"
					: side === "left"
						? "left-2 inset-y-2 rounded-lg ring-1 border-r-0"
						: "right-2 inset-y-2 rounded-lg ring-1 border-l-0",
	}))
}

const sheetContentStyles = cva(
	"fixed z-50 grid gap-4 border-tertiary bg-overlay text-overlay-fg shadow-lg transition ease-in-out",
	{
		variants: {
			isEntering: {
				true: "fade-in animate-in duration-300",
			},
			isExiting: {
				true: "fade-out animate-out",
			},
			side: {
				top: "entering:slide-in-from-top exiting:slide-out-to-top inset-x-0 top-0 rounded-b-2xl border-b",
				bottom: "entering:slide-in-from-bottom exiting:slide-out-to-bottom inset-x-0 bottom-0 rounded-t-2xl border-t",
				left: "entering:slide-in-from-left exiting:slide-out-to-left inset-y-0 left-0 h-auto w-3/4 overflow-y-auto border-r sm:max-w-sm",
				right: "entering:slide-in-from-right exiting:slide-out-to-right inset-y-0 right-0 h-auto w-3/4 overflow-y-auto border-l sm:max-w-sm",
			},
			isFloat: {
				false: "border-fg/20 dark:border-border",
				true: "ring-fg/5 dark:ring-border",
			},
		},
		compoundVariants: generateCompoundVariants(["top", "bottom", "left", "right"]),
	},
)

type SheetProps = DialogTriggerProps
const Sheet = (props: SheetProps) => {
	return <DialogTriggerPrimitive {...props} />
}

const DialogRoot = ({
	role = "dialog",
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive>) => {
	return (
		<DialogPrimitive
			role={role}
			className={twMerge(
				"peer/dialog group/dialog relative flex max-h-[inherit] flex-col overflow-hidden outline-hidden [--gutter:--spacing(0)]",
				className,
			)}
			{...props}
		/>
	)
}

const SheetTrigger = (props: ButtonProps) => <Button {...props} />

interface SheetHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
	title?: string
	description?: string
}

const SheetHeader = ({ className, ...props }: SheetHeaderProps) => {
	const headerRef = React.useRef<HTMLHeadingElement>(null)
	React.useEffect(() => {
		const header = headerRef.current
		if (!header) return
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				header.parentElement?.style.setProperty(
					"--dialog-header-height",
					`${entry.target.clientHeight}px`,
				)
			}
		})
		observer.observe(header)
		return () => observer.unobserve(header)
	}, [])
	return (
		<div
			data-slot="dialog-header"
			ref={headerRef}
			className={twMerge(
				"relative space-y-1 p-(--gutter) pb-[calc(var(--gutter)---spacing(3))]",
				className,
			)}
		>
			{props.title && <SheetTitle>{props.title}</SheetTitle>}
			{props.description && <SheetDescription>{props.description}</SheetDescription>}
			{!props.title && typeof props.children === "string" ? <SheetTitle {...props} /> : props.children}
		</div>
	)
}

interface SheetTitleProps extends HeadingProps {
	ref?: React.Ref<HTMLHeadingElement>
}
const SheetTitle = ({ className, ref, ...props }: SheetTitleProps) => (
	<Heading
		slot="title"
		ref={ref}
		className={twMerge("text-balance font-semibold text-fg text-lg/6 sm:text-base/6", className)}
		{...props}
	/>
)

interface SheetDescriptionProps extends TextProps {
	ref?: React.Ref<HTMLDivElement>
}
const SheetDescription = ({ className, ref, ...props }: SheetDescriptionProps) => (
	<Text
		slot="description"
		className={twMerge(
			"text-pretty text-base/6 text-muted-fg group-disabled:opacity-50 sm:text-sm/6",
			className,
		)}
		ref={ref}
		{...props}
	/>
)

interface SheetBodyProps extends React.ComponentProps<"div"> {}
const SheetBody = ({ className, ref, ...props }: SheetBodyProps) => (
	<div
		data-slot="dialog-body"
		ref={ref}
		className={twMerge(
			"flex max-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding)-var(--dialog-header-height,0px)-var(--dialog-footer-height,0px))] flex-1 flex-col overflow-auto px-(--gutter) py-1",
			className,
		)}
		{...props}
	/>
)

interface SheetFooterProps extends React.ComponentProps<"div"> {}
const SheetFooter = ({ className, ...props }: SheetFooterProps) => {
	const footerRef = React.useRef<HTMLDivElement>(null)
	React.useEffect(() => {
		const footer = footerRef.current
		if (!footer) return
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				footer.parentElement?.style.setProperty(
					"--dialog-footer-height",
					`${entry.target.clientHeight}px`,
				)
			}
		})
		observer.observe(footer)
		return () => {
			observer.unobserve(footer)
		}
	}, [])
	return (
		<div
			ref={footerRef}
			data-slot="dialog-footer"
			className={twMerge(
				"mt-auto flex flex-col-reverse justify-between gap-3 p-(--gutter) pt-[calc(var(--gutter)---spacing(3))] group-not-has-data-[slot=dialog-body]/dialog:pt-0 group-not-has-data-[slot=dialog-body]/popover:pt-0 sm:flex-row",
				className,
			)}
			{...props}
		/>
	)
}

const SheetClose = ({ className, ...props }: ButtonProps) => {
	return <Button slot="close" className={className} {...props} />
}

interface SheetCloseIconProps extends Omit<ButtonProps, "children"> {
	className?: string
	isDismissable?: boolean | undefined
}

const SheetCloseIcon = ({ className, ...props }: SheetCloseIconProps) => {
	return props.isDismissable ? (
		<Button
			aria-label="Close"
			slot="close"
			className={twMerge(
				"absolute top-1 right-1 z-50 grid size-8 place-content-center rounded-xl hover:bg-secondary focus:bg-secondary focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary sm:top-2 sm:right-2 sm:size-7 sm:rounded-md",
				className,
			)}
		>
			<IconClose className="size-4" />
		</Button>
	) : null
}

interface SheetContentProps
	extends Omit<ModalOverlayProps, "children">,
		Pick<DialogProps, "aria-label" | "role" | "aria-labelledby" | "children"> {
	closeButton?: boolean
	isBlurred?: boolean
	isFloat?: boolean
	side?: Sides
	overlay?: Omit<ModalOverlayProps, "children">
}

const SheetContent = ({
	className,
	isBlurred = false,
	isDismissable: isDismissableInternal,
	side = "right",
	role = "dialog",
	closeButton = false,
	isFloat = false,
	overlay,
	children,
	...props
}: SheetContentProps) => {
	const isDismissable = isDismissableInternal ?? role !== "alertdialog"
	return (
		<ModalOverlay
			isDismissable={isDismissable}
			className={({ isExiting, isEntering }) =>
				twJoin(
					"fixed inset-0 z-50 h-(--visual-viewport-height,100vh) w-screen overflow-hidden bg-black/15",
					isEntering && "fade-in animate-in duration-300",
					isExiting && "fade-out animate-out duration-200",
					isBlurred && "backdrop-blur-sm backdrop-filter",
				)
			}
			{...props}
		>
			<Modal
				className={composeRenderProps(className, (className, renderProps) =>
					sheetContentStyles({
						...renderProps,
						side,
						isFloat,
						className,
					}),
				)}
			>
				<DialogRoot aria-label={props["aria-label"]} role={role}>
					{(values) => (
						<>
							{typeof children === "function" ? children(values) : children}
							{closeButton && (
								<SheetCloseIcon className="top-2.5 right-2.5" isDismissable={isDismissable} />
							)}
						</>
					)}
				</DialogRoot>
			</Modal>
		</ModalOverlay>
	)
}

export type {
	SheetProps,
	SheetContentProps,
	Sides,
	SheetHeaderProps,
	SheetTitleProps,
	SheetBodyProps,
	SheetFooterProps,
	SheetDescriptionProps,
	SheetCloseIconProps,
}
export {
	Sheet,
	SheetTrigger,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetBody,
	SheetClose,
	SheetContent,
}
