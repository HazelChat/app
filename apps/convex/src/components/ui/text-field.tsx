import type { Field } from "@ark-ui/solid"
import { type JSXElement, Show, splitProps } from "solid-js"
import { FieldErrorText, FieldGroup, FieldHelperText, FieldInput, FieldLabel, FieldRoot } from "./field"

export interface TextFieldProps extends Omit<Field.InputProps, "prefix"> {
	label?: string
	helperText?: string
	errorText?: string

	prefix?: JSXElement
	suffix?: JSXElement

	isInvalid?: boolean
}

export const TextField = (props: TextFieldProps) => {
	const [specialProps, fieldRootProps, rest] = splitProps(
		props,
		["prefix", "suffix", "label", "helperText", "errorText"],
		["isInvalid"],
	)

	return (
		<FieldRoot invalid={fieldRootProps.isInvalid}>
			<Show when={specialProps.label}>
				<FieldLabel>{specialProps.label}</FieldLabel>
			</Show>
			<FieldGroup>
				<Show when={specialProps.prefix}>
					<Show when={typeof specialProps.prefix === "string"} fallback={specialProps.prefix}>
						<span class="ml-2 text-muted-foreground">{specialProps.prefix}</span>
					</Show>
				</Show>
				<FieldInput
					{...rest}
					class="w-full min-w-0 bg-transparent px-2.5 py-2 text-base text-foreground placeholder-muted-foreground outline-hidden focus:outline-hidden sm:text-sm/6 [&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden"
				/>
				<Show when={specialProps.suffix}>
					<Show when={typeof specialProps.suffix === "string"} fallback={specialProps.suffix}>
						<span class="mr-2 text-muted-foreground">{specialProps.suffix}</span>
					</Show>
				</Show>
			</FieldGroup>
			<Show when={specialProps.helperText}>
				<FieldHelperText>{specialProps.helperText}</FieldHelperText>
			</Show>
			<FieldErrorText>{specialProps.errorText}</FieldErrorText>
		</FieldRoot>
	)
}
