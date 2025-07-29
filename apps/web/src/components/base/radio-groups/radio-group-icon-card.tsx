import type { FC, ReactNode } from "react"
import type { RadioGroupProps } from "react-aria-components"
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components"
import { BadgeWithDot } from "~/components/base/badges/badges"
import { CheckboxBase } from "~/components/base/checkbox/checkbox"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { cx } from "~/utils/cx"

type IconCardItemType = {
	value: string
	title: string
	description: string
	secondaryTitle?: string
	disabled?: boolean
	price?: string
	badge?: ReactNode
	icon: FC<{ className?: string }>
}

interface RadioGroupIconCardProps extends RadioGroupProps {
	size?: "sm" | "md"
	items: IconCardItemType[]
}

export const RadioGroupIconCard = ({ items, size = "sm", className, ...props }: RadioGroupIconCardProps) => {
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
					className={({ isDisabled, isSelected, isFocusVisible }) =>
						cx(
							"relative block cursor-pointer rounded-xl bg-primary outline-focus-ring ring-inset",
							isSelected ? "ring-2 ring-brand" : "ring-1 ring-secondary",
							isDisabled && "cursor-not-allowed bg-disabled_subtle ring-disabled",
							isSelected && isDisabled && "ring-disabled_subtle",
							isFocusVisible && "outline-2 outline-offset-2",
						)
					}
				>
					{({ isDisabled, isSelected, isFocusVisible }) => (
						<>
							<div
								className={cx(
									"flex items-center gap-3 rounded-t-xl p-3 pr-5 ring-inset",
									isSelected ? "ring-2 ring-brand" : "ring-1 ring-secondary",
									isDisabled && "ring-disabled",
									isSelected && isDisabled && "ring-disabled_subtle",
									isFocusVisible && "outline-hidden",
								)}
							>
								<FeaturedIcon
									size={size === "md" ? "md" : "sm"}
									icon={plan.icon}
									color="gray"
									theme="modern"
									className={cx(isDisabled && "bg-disabled text-fg-disabled")}
								/>

								<span
									className={cx(
										"mr-1 text-secondary",
										size === "md" ? "text-lg font-semibold" : "text-md font-semibold",
									)}
								>
									{plan.title}
								</span>

								<CheckboxBase
									size={size === "md" ? "md" : "sm"}
									className="ml-auto"
									isDisabled={isDisabled}
									isSelected={isSelected}
									isFocusVisible={isFocusVisible}
								/>
							</div>

							<div className="flex flex-col-reverse items-start justify-between gap-4 rounded-b-lg p-4 sm:flex-row sm:gap-1">
								<div className={cx("flex flex-col", size === "md" ? "gap-2" : "gap-1")}>
									<p className="flex items-baseline gap-1">
										<span
											className={cx(
												"text-secondary",
												size === "md"
													? "text-display-md font-semibold"
													: "text-display-sm font-semibold",
											)}
										>
											{plan.price}
										</span>
										<span
											className={cx(
												"text-tertiary",
												size === "md" ? "text-md" : "text-sm",
											)}
										>
											{plan.secondaryTitle}
										</span>
									</p>
									<p className={cx("text-tertiary", size === "md" ? "text-md" : "text-sm")}>
										{plan.description}
									</p>
								</div>
								{plan.badge && (
									<BadgeWithDot size="sm" type="modern" color="success">
										{plan.badge}
									</BadgeWithDot>
								)}
							</div>
						</>
					)}
				</AriaRadio>
			))}
		</AriaRadioGroup>
	)
}
