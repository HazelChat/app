import type { Field } from "@ark-ui/solid"
import type { JSXElement } from "solid-js"
import { Show, splitProps } from "solid-js"
import { FieldErrorText, FieldGroup, FieldHelperText, FieldLabel, FieldRoot, FieldSelect } from "./field"

export interface SelectNativeProps extends Omit<Field.SelectProps, "prefix"> {
	label?: string
	helperText?: string
	errorText?: string

	prefix?: JSXElement

	isInvalid?: boolean
}

const SelectNative = (props: SelectNativeProps) => {
	const [specialProps, fieldRootProps, rest] = splitProps(
		props,
		["prefix", "label", "helperText", "errorText"],
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
				<FieldSelect {...rest} />
			</FieldGroup>
			<Show when={specialProps.helperText}>
				<FieldHelperText>{specialProps.helperText}</FieldHelperText>
			</Show>
			<FieldErrorText>{specialProps.errorText}</FieldErrorText>
		</FieldRoot>
	)
}

export { SelectNative }
