// src/components/ui/button.tsx

import { type HTMLArkProps, ark } from "@ark-ui/solid"
import { type Component, splitProps } from "solid-js"
// Keep tailwind-variants
import { type VariantProps, tv } from "tailwind-variants"

const buttonVariants = tv({
	base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	variants: {
		intent: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline:
				"bg-muted hover:bg-background dark:bg-muted/25 dark:hover:bg-muted/50 dark:border-border inset-shadow-2xs inset-shadow-white dark:inset-shadow-transparent relative flex border border-zinc-300 shadow-sm shadow-zinc-950/10 ring-0 duration-150",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline",
			icon: "text-muted-foreground hover:text-foreground",
		},
		size: {
			default: "h-9 px-4 py-2",
			small: "h-8 rounded-md px-3 text-xs",
			large: "h-10 rounded-md px-8",
			icon: "size-6 [&_svg]:size-6",
			"icon-small": "size-4 [&_svg]:size-4",
			square: "size-9",
		},
	},
	defaultVariants: {
		intent: "default",
		size: "default",
	},
})

export interface ButtonProps extends HTMLArkProps<"button">, VariantProps<typeof buttonVariants> {
	isPending?: boolean
}

const Button: Component<ButtonProps> = (props) => {
	const [local, rest] = splitProps(props, ["class", "intent", "size", "children"])

	const classes = buttonVariants({
		intent: local.intent,
		size: local.size,
		className: local.class,
	})

	return (
		<ark.button class={classes} {...rest}>
			{local.children}
		</ark.button>
	)
}

export { Button, buttonVariants }
