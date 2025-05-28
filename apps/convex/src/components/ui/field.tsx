import {
	Field,
	type FieldErrorTextProps,
	type FieldHelperTextProps,
	type FieldInputProps,
	type FieldLabelProps,
	type FieldRootProps,
	type FieldSelectProps,
} from "@ark-ui/solid"
import { type JSX, Show, splitProps } from "solid-js"
import { tv } from "tailwind-variants"
import { focusStyles } from "~/lib/primitive"

import { twMerge } from "tailwind-merge"
import { IconChevronDown } from "../icons/chevron-down"

const fieldStyles = tv({
	slots: {
		description: "text-pretty text-muted-foreground text-sm/6",
		label: "w-fit cursor-default font-medium text-secondary-foreground text-sm/6",
		fieldError: "text-destructive text-sm/6 forced-colors:text-[Mark]",
	},
})

const { description, label, fieldError } = fieldStyles()

const fieldGroupStyles = tv({
	base: [
		"group flex h-10 items-center overflow-hidden rounded-lg border border-input shadow-xs transition duration-200 ease-out",
		"relative focus-within:ring-1 group-invalid:focus-within:border-destructive group-invalid:focus-within:ring-destructive/20",
		"[&>[role=progressbar]:first-child]:ml-2.5 [&>[role=progressbar]:last-child]:mr-2.5",
		"**:data-[slot=icon]:size-4 **:data-[slot=icon]:shrink-0 **:[button]:shrink-0",
		"[&>button:has([data-slot=icon]):first-child]:left-0 [&>button:has([data-slot=icon]):last-child]:right-0 [&>button:has([data-slot=icon])]:absolute",
		"*:data-[slot=icon]:pointer-events-none *:data-[slot=icon]:absolute *:data-[slot=icon]:top-[calc(var(--spacing)*2.7)] *:data-[slot=icon]:z-10 *:data-[slot=icon]:size-4 *:data-[slot=icon]:text-muted-foreground",
		"[&>[data-slot=icon]:first-child]:left-2.5 [&>[data-slot=icon]:last-child]:right-2.5",
		"[&:has([data-slot=icon]+input)]:pl-6 [&:has(input+[data-slot=icon])]:pr-6",
		"[&:has([data-slot=icon]+[role=group])]:pl-6 [&:has([role=group]+[data-slot=icon])]:pr-6",
		"has-[[data-slot=icon]:last-child]:[&_input]:pr-7",
		"*:[button]:h-8 *:[button]:rounded-[calc(var(--radius-sm)-1px)] *:[button]:px-2.5",
		"[&>button:first-child]:ml-[calc(var(--spacing)*0.7)] [&>button:last-child]:mr-[calc(var(--spacing)*0.7)]",
	],
	variants: {
		isFocusWithin: focusStyles.variants.isFocused,
		isInvalid: focusStyles.variants.isInvalid,
		isDisabled: {
			true: "opacity-50 forced-colors:border-[GrayText]",
		},
	},
})

export const FieldErrorText = (props: FieldErrorTextProps) => {
	const [classProps, rest] = splitProps(props, ["class"])

	return <Field.ErrorText {...rest} class={fieldError({ class: classProps.class })} />
}

export const FieldRoot = (props: FieldRootProps) => {
	const [classProps, rest] = splitProps(props, ["class"])

	return <Field.Root {...rest} class={twMerge("group flex flex-col gap-y-1", classProps.class)} />
}

export const FieldGroup = (props: JSX.HTMLAttributes<HTMLDivElement>) => {
	const [classProps, rest] = splitProps(props, ["class"])

	return <div {...rest} class={fieldGroupStyles({ class: classProps.class })} />
}

export const FieldLabel = (props: FieldLabelProps) => {
	const [classProps, rest] = splitProps(props, ["class"])
	return <Field.Label {...rest} class={label({ class: classProps.class })} />
}

export const FieldHelperText = (props: FieldHelperTextProps) => {
	const [classProps, rest] = splitProps(props, ["class"])
	return <Field.HelperText {...rest} class={description({ class: classProps.class })} />
}

export const FieldInput = (props: FieldInputProps) => {
	const [classProps, rest] = splitProps(props, ["class"])

	return (
		<Field.Input
			{...rest}
			class={twMerge(
				"w-full min-w-0 bg-transparent px-2.5 py-2 text-base text-foreground placeholder-muted-foreground outline-hidden focus:outline-hidden sm:text-sm/6 [&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden",
				classProps.class,
			)}
		/>
	)
}

export const FieldSelect = (props: FieldSelectProps) => {
	const [classProps, rest] = splitProps(props, ["class", "multiple"])

	return (
		<div class="relative flex w-full">
			<Field.Select
				{...rest}
				class={twMerge(
					"peer inline-flex w-full cursor-pointer appearance-none items-center rounded-md text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[1px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 has-[option[disabled]:checked]:text-muted-foreground aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 dark:aria-[invalid=true]:ring-destructive/40",
					classProps.multiple ? "py-1 *:px-3 *:py-1 [&_option:checked]:bg-accent" : "h-9 ps-3 pe-8",
					classProps.class,
				)}
				multiple={classProps.multiple}
			/>
			<Show when={!classProps.multiple}>
				<span class="pointer-events-none absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 peer-disabled:opacity-50 peer-aria-[invalid=true]:text-destructive/80">
					<IconChevronDown class="size-4" aria-hidden="true" />
				</span>
			</Show>
		</div>
	)
}
