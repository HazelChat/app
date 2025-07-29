import type { RadioGroupProps } from "react-aria-components"
import {
	Label as AriaLabel,
	Radio as AriaRadio,
	RadioGroup as AriaRadioGroup,
	Text as AriaText,
} from "react-aria-components"
import { Avatar as AvatarComponent } from "~/components/base/avatar/avatar"
import { CheckboxBase } from "~/components/base/checkbox/checkbox"
import { cx } from "~/utils/cx"

interface AvatarItemType {
	id: string
	name: string
	username: string
	title: string
	avatarUrl: string
	disabled?: boolean
}

interface RadioGroupAvatarProps extends RadioGroupProps {
	size?: "sm" | "md"
	items: AvatarItemType[]
}

export const RadioGroupAvatar = ({ items, size = "sm", className, ...props }: RadioGroupAvatarProps) => {
	return (
		<AriaRadioGroup
			{...props}
			className={(state) =>
				cx("flex flex-col gap-3", typeof className === "function" ? className(state) : className)
			}
		>
			{items.map((person) => (
				<AriaRadio
					isDisabled={person.disabled}
					key={person.id}
					value={person.id}
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
								<AvatarComponent
									alt={person.name}
									src={person.avatarUrl}
									size={size === "md" ? "md" : "sm"}
								/>

								<div className={cx("flex flex-col", size === "md" ? "gap-0.5" : "")}>
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
											{person.name}
										</span>
										<span
											className={cx(
												"text-tertiary",
												size === "md" ? "text-md" : "text-sm",
											)}
										>
											{person.username}
										</span>
									</AriaLabel>
									<AriaText
										slot="description"
										className={cx("text-tertiary", size === "md" ? "text-md" : "text-sm")}
									>
										{person.title}
									</AriaText>
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
