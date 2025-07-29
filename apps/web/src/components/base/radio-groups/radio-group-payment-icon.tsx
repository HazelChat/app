import type { ReactNode } from "react"
import type { RadioGroupProps } from "react-aria-components"
import {
	Label as AriaLabel,
	Radio as AriaRadio,
	RadioGroup as AriaRadioGroup,
	Text as AriaText,
} from "react-aria-components"
import { Button } from "~/components/base/buttons/button"
import { CheckboxBase } from "~/components/base/checkbox/checkbox"
import { cx } from "~/utils/cx"

interface PaymentCardItemType {
	value: string
	title: string
	description: string
	logo: ReactNode
	disabled?: boolean
}

interface RadioGroupPaymentIconProps extends RadioGroupProps {
	size?: "sm" | "md"
	items: PaymentCardItemType[]
}

export const RadioGroupPaymentIcon = ({
	items,
	size = "sm",
	className,
	...props
}: RadioGroupPaymentIconProps) => {
	return (
		<AriaRadioGroup
			{...props}
			className={(state) =>
				cx("flex flex-col gap-3", typeof className === "function" ? className(state) : className)
			}
		>
			{items.map((card) => (
				<AriaRadio
					isDisabled={card.disabled}
					key={card.value}
					value={card.value}
					className={({ isDisabled, isSelected, isFocusVisible }) =>
						cx(
							"relative flex cursor-pointer items-start gap-1 rounded-xl bg-primary p-4 outline-focus-ring ring-inset",
							isSelected ? "ring-2 ring-brand" : "ring-1 ring-secondary",
							isDisabled && "cursor-not-allowed bg-disabled_subtle ring-disabled_subtle",
							isFocusVisible && "outline-2 outline-offset-2",
						)
					}
				>
					{({ isDisabled, isSelected, isFocusVisible }) => (
						<>
							<div className={cx("flex flex-1", size === "md" ? "gap-3 md:gap-4" : "gap-3")}>
								<span className="shrink-0">{card.logo}</span>
								<div>
									<div className={cx("flex flex-col", size === "md" ? "gap-0.5" : "")}>
										<AriaLabel
											className={cx(
												"pointer-events-none text-secondary",
												size === "md" ? "text-md font-medium" : "text-sm font-medium",
											)}
										>
											{card.title}
										</AriaLabel>
										<AriaText
											slot="description"
											className={cx(
												"text-tertiary",
												size === "md" ? "text-md" : "text-sm",
											)}
										>
											{card.description}
										</AriaText>
									</div>
									<div className={cx("flex gap-3", size === "md" ? "mt-3" : "mt-2")}>
										<Button
											color="link-gray"
											size={size === "md" ? "md" : "sm"}
											isDisabled={isDisabled}
										>
											Set as default
										</Button>
										<Button
											color="link-color"
											size={size === "md" ? "md" : "sm"}
											isDisabled={isDisabled}
										>
											Edit
										</Button>
									</div>
								</div>
							</div>

							<CheckboxBase
								size={size === "md" ? "md" : "sm"}
								isDisabled={isDisabled}
								isSelected={isSelected}
								isFocusVisible={isFocusVisible}
							/>
						</>
					)}
				</AriaRadio>
			))}
		</AriaRadioGroup>
	)
}
