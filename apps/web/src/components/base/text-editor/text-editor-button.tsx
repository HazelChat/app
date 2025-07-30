import { Button as AriaButton, type ButtonProps } from "react-aria-components";
import { cx } from "~/utils/cx";

interface EditorButtonProps extends ButtonProps {
    isActive?: boolean;
}

export const EditorButton = ({ isActive, isDisabled, className, children, ...props }: EditorButtonProps) => {
    return (
        <AriaButton
            {...props}
            type="button"
            isDisabled={isDisabled}
            className={(state) =>
                cx(
                    "flex size-8 cursor-pointer items-center justify-center rounded-md pressed:bg-primary_hover p-0! text-fg-quaternary outline-focus-ring pressed:outline-hidden transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2",
                    isActive ? "bg-primary_hover text-fg-secondary" : "hover:bg-primary_hover hover:text-fg-quaternary_hover",
                    isDisabled && "cursor-not-allowed",
                    typeof className === "function" ? className(state) : className,
                )
            }
        >
            {children}
        </AriaButton>
    );
};
