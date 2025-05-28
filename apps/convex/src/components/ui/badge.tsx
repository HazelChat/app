import type { Component, JSX } from "solid-js"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type VariantProps, tv } from "tailwind-variants"

const badgeVariants = tv({
	base: "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",

	variants: {
		variant: {
			default: [
				"border-transparent",
				"[--badge-primary:color-mix(in_oklab,var(--color-primary)_10%,white_90%)] [--badge-primary-fg:color-mix(in_oklab,var(--color-primary)_60%,white_40%)] bg-(--badge-primary)",
				"dark:bg-primary/15 text-primary dark:text-(--badge-primary-fg) dark:group-hover:bg-primary/25",
				"group-hover:bg-[color-mix(in_oklab,var(--color-primary)_15%,white_85%)] dark:group-hover:bg-primary/20",
			],
			secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
			destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
			outline: "text-foreground",
		},
	},
	defaultVariants: {
		variant: "default",
	},
})

type BadgeProps = JSX.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>

const Badge: Component<BadgeProps> = (props) => {
	const [local, rest] = splitProps(props, ["class", "variant"])

	return <div class={twMerge(badgeVariants({ variant: local.variant }), local.class)} {...rest} />
}

export { Badge, badgeVariants }
export type { BadgeProps }
