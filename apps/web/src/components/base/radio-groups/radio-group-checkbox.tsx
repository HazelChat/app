import type { FC } from "react"
import type { RadioGroupProps } from "react-aria-components"
import {
	Label as AriaLabel,
	Radio as AriaRadio,
	RadioGroup as AriaRadioGroup,
	Text as AriaText,
} from "react-aria-components"
import { CheckboxBase } from "~/components/base/checkbox/checkbox"
import { cx } from "~/utils/cx"

type RadioGroupItemType = {
	value: string
	title: string
	disabled?: boolean
	description: string
	secondaryTitle: string
	icon: FC<{ className?: string }>
}

interface RadioGroupCheckboxProps extends RadioGroupProps {
	size?: "sm" | "md"
	items: RadioGroupItemType[]
}

export const RadioGroupCheckbox = ({ items, size = "sm", className, ...props }: RadioGroupCheckboxProps) => {
	return (
		<AriaRadioGroup
			{...props}
			className={(state) =>
				cx("flex flex-col gap-3", typeof className === "function" ? className(state) : className)
			}
		>
			{items.map((plan) => (
				<AriaRadio
					isDisabled={plan.disabled}
					key={plan.value}
					value={plan.value}
					className={({ isDisabled, isFocusVisible, isSelected }) =>
						cx(
							"relative flex cursor-pointer items-start gap-1 rounded-xl bg-primary p-4 outline-focus-ring ring-inset",
							size === "md" ? "gap-3" : "gap-2",
							isSelected ? "ring-2 ring-brand" : "ring-1 ring-secondary",
							isDisabled && "cursor-not-allowed bg-disabled_subtle ring-disabled_subtle",
							isFocusVisible && "outline-2 outline-offset-2",
						)
					}
				>
					{({ isDisabled, isSelected, isFocusVisible }) => (
						<>
							<CheckboxBase
								size={size === "md" ? "md" : "sm"}
								isDisabled={isDisabled}
								isSelected={isSelected}
								isFocusVisible={isFocusVisible}
								className="mt-0.5"
							/>

							<div
								className={cx(
									"flex flex-col",

									size === "md" ? "gap-0.5" : "",
								)}
							>
								<AriaLabel
									className={cx(
										"pointer-events-none flex",
										size === "md" ? "gap-1.5" : "gap-1",
									)}
								>
									<span
										className={cx(
											"text-secondary",
											size === "md" ? "text-md font-medium" : "text-sm font-medium",
										)}
									>
										{plan.title}
									</span>
									<span
										className={cx("text-tertiary", size === "md" ? "text-md" : "text-sm")}
									>
										{plan.secondaryTitle}
									</span>
								</AriaLabel>
								<AriaText
									slot="description"
									className={cx("text-tertiary", size === "md" ? "text-md" : "text-sm")}
								>
									{plan.description}
								</AriaText>
							</div>
						</>
					)}
				</AriaRadio>
			))}
		</AriaRadioGroup>
	)
}
