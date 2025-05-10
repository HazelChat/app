import { type HTMLArkProps, ark } from "@ark-ui/solid"
import { splitProps } from "solid-js"

import { twMerge } from "tailwind-merge"
import { type VariantProps, tv } from "tailwind-variants"

export type AvatarProps = {
	name: string
	src?: string
} & HTMLArkProps<"img"> &
	VariantProps<typeof avatarVariants>

export const Avatar = (props: AvatarProps) => {
	const [localProps, rootProps] = splitProps(props, ["name", "src"])

	return (
		<ark.img
			class={twMerge(avatarVariants(rootProps), rootProps.class)}
			src={localProps.src || `https://avatar.vercel.sh/${props.name}.svg`}
			alt={localProps.name}
		/>
	)
}

export const avatarVariants = tv({
	base: "relative flex shrink-0 overflow-hidden",
	variants: {
		shape: {
			circle: "rounded-full",
			square: "rounded-md",
		},
		size: {
			default: "size-10",
			sm: "size-8",
			xs: "size-6",
			xss: "size-4",
		},
	},
	defaultVariants: {
		shape: "square",
		size: "default",
	},
})
