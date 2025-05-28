import type { Component, JSX } from "solid-js"
import { createMemo, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

type SeparatorProps = JSX.HTMLAttributes<HTMLDivElement> & {
	orientation?: "horizontal" | "vertical"
}

const Separator: Component<SeparatorProps> = (props) => {
	const [local, rest] = splitProps(props, ["class", "orientation"])
	const orientation = createMemo(() => local.orientation ?? "horizontal")

	return (
		// biome-ignore lint/a11y/useFocusableInteractive: <explanation>
		<div
			// Apply accessibility role and orientation
			role="separator"
			aria-orientation={orientation()}
			// Merge Tailwind classes
			class={twMerge(
				// Base styles
				"shrink-0 bg-border",
				// Orientation-specific styles
				orientation() === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
				// User-provided classes
				local.class,
			)}
			// Pass down any other div attributes
			{...rest}
		/>
	)
}

export { Separator }
