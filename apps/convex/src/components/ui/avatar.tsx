import { type HTMLArkProps, ark } from "@ark-ui/solid"
import { splitProps } from "solid-js"

import { type VariantProps, tv } from "tailwind-variants"

export type AvatarProps = {
	name: string
	src?: string
} & HTMLArkProps<"img"> &
	VariantProps<typeof avatarVariants>

export const Avatar = (props: AvatarProps) => {
	const [localProps, rootProps] = splitProps(props, ["name", "src", "class"])

	return (
		<ark.img
			class={avatarVariants({ ...rootProps, class: localProps.class })}
			src={localProps.src || `https://avatar.vercel.sh/${props.name}.svg`}
			alt={localProps.name}
			{...rootProps}
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
			xxl: "size-16",
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
