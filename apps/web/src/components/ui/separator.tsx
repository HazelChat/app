import { Separator as Divider, type SeparatorProps } from "react-aria-components"
import { cx } from "~/utils/cx";

const Separator = ({ orientation = "horizontal", className, ...props }: SeparatorProps) => {
	return (
		<Divider
			className={cx(
				"shrink-0 border-0 bg-border-secondary forced-colors:bg-[ButtonBorder]",
				orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
				className,
			)}
			{...props}
		/>
	)
}

export type { SeparatorProps }
export { Separator }
