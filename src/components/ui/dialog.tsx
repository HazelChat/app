import { Dialog } from "@ark-ui/solid"
import { type JSX, splitProps } from "solid-js"
import { Portal } from "solid-js/web"
import { twMerge } from "tailwind-merge"

export const DialogRoot = Dialog.Root
export const DialogTrigger = Dialog.Trigger

export const DialogBackdrop = (props: Dialog.BackdropProps) => {
	return (
		<Dialog.Backdrop
			class="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in"
			{...props}
		/>
	)
}

export const DialogContent = (props: Dialog.ContentProps) => {
	const [local, rest] = splitProps(props, ["class", "children"])

	return (
		<Portal>
			<DialogBackdrop />
			<Dialog.Positioner>
				<Dialog.Content
					class={twMerge(
						local.class,
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in sm:rounded-lg",
					)}
					{...rest}
				>
					{local.children}
				</Dialog.Content>
			</Dialog.Positioner>
		</Portal>
	)
}

export const DialogHeader = (props: JSX.IntrinsicElements["div"]) => {
	const [local, rest] = splitProps(props, ["class"])

	return <div class={twMerge("flex flex-col space-y-1.5 text-center sm:text-left", local.class)} {...rest} />
}

export const DialogFooter = (props: JSX.IntrinsicElements["div"]) => {
	const [local, rest] = splitProps(props, ["class"])

	return (
		<div class={twMerge("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", local.class)} {...rest} />
	)
}

export const DialogTitle = (props: Dialog.TitleProps) => {
	const [local, rest] = splitProps(props, ["class"])

	return <Dialog.Title class={twMerge("font-semibold text-lg leading-none tracking-tight", local.class)} {...rest} />
}

export const DialogDescription = (props: Dialog.TitleProps) => {
	const [local, rest] = splitProps(props, ["class"])

	return <Dialog.Description class={twMerge("text-muted-foreground text-sm", local.class)} {...rest} />
}
