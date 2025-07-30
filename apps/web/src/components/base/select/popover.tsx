import type { RefAttributes } from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import { Popover as AriaPopover } from "react-aria-components";
import { cx } from "~/utils/cx";

interface PopoverProps extends AriaPopoverProps, RefAttributes<HTMLElement> {
    size: "sm" | "md";
}

export const Popover = (props: PopoverProps) => {
    return (
        <AriaPopover
            placement="bottom"
            containerPadding={0}
            offset={4}
            {...props}
            className={(state) =>
                cx(
                    "max-h-64! w-(--trigger-width) overflow-y-auto overflow-x-hidden rounded-lg bg-primary py-1 shadow-lg outline-hidden ring-1 ring-secondary_alt will-change-transform",

                    state.isEntering &&
                        "fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5 placement-bottom:origin-top placement-right:origin-left placement-top:origin-bottom animate-in duration-150 ease-out",
                    state.isExiting &&
                        "fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5 placement-bottom:origin-top placement-right:origin-left placement-top:origin-bottom animate-out duration-100 ease-in",
                    props.size === "md" && "max-h-80!",

                    typeof props.className === "function" ? props.className(state) : props.className,
                )
            }
        />
    );
};
