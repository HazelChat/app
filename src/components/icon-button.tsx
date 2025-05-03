import { twMerge } from "tailwind-merge"
import { Button, type ButtonProps } from "./ui/button"
import { splitProps, type JSX } from "solid-js"

export function IconButton(allProps: { class: string; children: JSX.Element } & ButtonProps) {
	// Split the props to extract rest
	const [props, rest] = splitProps(allProps, ["class", "children"])

	return (
		<Button
			class={twMerge(
				"flex flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground",
				props.class,
			)}
			{...rest}
		>
			{props.children}
		</Button>
	)
}
