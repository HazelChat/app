import type { FocusEventHandler, PointerEventHandler, RefAttributes, RefObject } from "react"
import { useCallback, useContext, useRef, useState } from "react"
import type {
	ComboBoxProps as AriaComboBoxProps,
	GroupProps as AriaGroupProps,
	ListBoxProps as AriaListBoxProps,
} from "react-aria-components"
import {
	ComboBox as AriaComboBox,
	Group as AriaGroup,
	Input as AriaInput,
	ListBox as AriaListBox,
	ComboBoxStateContext,
} from "react-aria-components"
import { HintText } from "~/components/base/input/hint-text"
import { Label } from "~/components/base/input/label"
import { Popover } from "~/components/base/select/popover"
import { type CommonProps, SelectContext, type SelectItemType, sizes } from "~/components/base/select/select"
import IconMagnifier3 from "~/components/icons/icon-magnifier-3"
import { useResizeObserver } from "~/hooks/use-resize-observer"
import { cx } from "~/utils/cx"

interface ComboBoxProps
	extends Omit<AriaComboBoxProps<SelectItemType>, "children" | "items">,
		RefAttributes<HTMLDivElement>,
		CommonProps {
	shortcut?: boolean
	items?: SelectItemType[]
	popoverClassName?: string
	shortcutClassName?: string
	children: AriaListBoxProps<SelectItemType>["children"]
}

interface ComboBoxValueProps extends AriaGroupProps {
	size: "sm" | "md"
	shortcut: boolean
	placeholder?: string
	shortcutClassName?: string
	onFocus?: FocusEventHandler
	onPointerEnter?: PointerEventHandler
	ref?: RefObject<HTMLDivElement | null>
}

const ComboBoxValue = ({
	size,
	shortcut,
	placeholder,
	shortcutClassName,
	...otherProps
}: ComboBoxValueProps) => {
	const state = useContext(ComboBoxStateContext)

	const value = state?.selectedItem?.value || null
	const inputValue = state?.inputValue || null

	const first = inputValue?.split(value?.supportingText)?.[0] || ""
	const last = inputValue?.split(first)[1]

	return (
		<AriaGroup
			{...otherProps}
			className={({ isFocusWithin, isDisabled }) =>
				cx(
					"relative flex w-full items-center gap-2 rounded-lg bg-primary shadow-xs outline-hidden ring ring-primary ring-inset transition-shadow duration-100 ease-linear",
					isDisabled && "cursor-not-allowed bg-disabled_subtle",
					isFocusWithin && "ring-2 ring-brand",
					sizes[size].root,
				)
			}
		>
			{({ isDisabled }) => (
				<>
					<IconMagnifier3 className="pointer-events-none size-5 text-fg-quaternary" />

					<div className="relative flex w-full items-center gap-2">
						{inputValue && (
							<span
								className="-translate-y-1/2 absolute top-1/2 z-0 inline-flex w-full gap-2 truncate"
								aria-hidden="true"
							>
								<p
									className={cx(
										"font-medium text-md text-primary",
										isDisabled && "text-disabled",
									)}
								>
									{first}
								</p>
								{last && (
									<p
										className={cx(
											"-ml-0.75 text-md text-tertiary",
											isDisabled && "text-disabled",
										)}
									>
										{last}
									</p>
								)}
							</span>
						)}

						<AriaInput
							placeholder={placeholder}
							className="z-10 w-full appearance-none bg-transparent text-md text-transparent caret-alpha-black/90 placeholder:text-placeholder focus:outline-hidden disabled:cursor-not-allowed disabled:text-disabled disabled:placeholder:text-disabled"
						/>
					</div>

					{shortcut && (
						<div
							className={cx(
								"absolute inset-y-0.5 right-0.5 z-10 flex items-center rounded-r-[inherit] bg-linear-to-r from-transparent to-40% to-bg-primary pl-8",
								isDisabled && "to-bg-disabled_subtle",
								sizes[size].shortcut,
								shortcutClassName,
							)}
						>
							<span
								className={cx(
									"pointer-events-none inset-ring inset-ring-secondary select-none rounded px-1 py-px font-medium text-quaternary text-xs",
									isDisabled && "bg-transparent text-disabled",
								)}
								aria-hidden="true"
							>
								⌘K
							</span>
						</div>
					)}
				</>
			)}
		</AriaGroup>
	)
}

export const ComboBox = ({
	placeholder = "Search",
	shortcut = true,
	size = "sm",
	children,
	items,
	shortcutClassName,
	...otherProps
}: ComboBoxProps) => {
	const placeholderRef = useRef<HTMLDivElement>(null)
	const [popoverWidth, setPopoverWidth] = useState("")

	const onResize = useCallback(() => {
		if (!placeholderRef.current) return

		const divRect = placeholderRef.current?.getBoundingClientRect()

		setPopoverWidth(`${divRect.width}px`)
	}, [])

	useResizeObserver({
		ref: placeholderRef,
		box: "border-box",
		onResize,
	})

	return (
		<SelectContext.Provider value={{ size }}>
			<AriaComboBox menuTrigger="focus" {...otherProps}>
				{(state) => (
					<div className="flex flex-col gap-1.5">
						{otherProps.label && (
							<Label isRequired={state.isRequired} tooltip={otherProps.tooltip}>
								{otherProps.label}
							</Label>
						)}

						<ComboBoxValue
							ref={placeholderRef}
							placeholder={placeholder}
							shortcut={shortcut}
							shortcutClassName={shortcutClassName}
							size={size}
							// Workaround: ResizeObserver alone wasn't reliable for width calculation
							onFocus={onResize}
							onPointerEnter={onResize}
						/>

						<Popover
							size={size}
							triggerRef={placeholderRef}
							style={{ width: popoverWidth }}
							className={otherProps.popoverClassName}
						>
							<AriaListBox items={items} className="size-full outline-hidden">
								{children}
							</AriaListBox>
						</Popover>

						{otherProps.hint && (
							<HintText isInvalid={state.isInvalid}>{otherProps.hint}</HintText>
						)}
					</div>
				)}
			</AriaComboBox>
		</SelectContext.Provider>
	)
}
