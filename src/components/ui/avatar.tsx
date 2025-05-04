import { Avatar as ArkAvatar } from "@ark-ui/solid"
import { Show, splitProps } from "solid-js"

import { twMerge } from "tailwind-merge"
import { type VariantProps, tv } from "tailwind-variants"
import { IconUser } from "../icons/user"

export interface AvatarProps extends AvatarRootProps {
	name?: string
	src?: string
}

const getInitials = (name = "") =>
	name
		.split(" ")
		.map((part) => part[0])
		.splice(0, 2)
		.join("")
		.toUpperCase()

export const AvatarMolecule = (props: AvatarProps) => {
	const [localProps, rootProps] = splitProps(props, ["name", "src"])

	return (
		<AvatarRoot {...rootProps}>
			<AvatarFallback>
				<Show when={localProps.name} fallback={<IconUser />}>
					{getInitials(localProps.name)}
				</Show>
			</AvatarFallback>
			<AvatarImage src={localProps.src} alt={localProps.name} />
		</AvatarRoot>
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
		},
	},
	defaultVariants: {
		shape: "square",
		size: "default",
	},
})

export interface AvatarRootProps extends ArkAvatar.RootProps, VariantProps<typeof avatarVariants> {}

export const AvatarRoot = (props: AvatarRootProps) => {
	const [local, rest] = splitProps(props, ["class", "shape", "size"])

	return <ArkAvatar.Root class={twMerge(avatarVariants(local), local.class)} {...rest} />
}

export const AvatarImage = (props: ArkAvatar.ImageProps) => {
	return <ArkAvatar.Image class={twMerge("aspect-square h-full w-full", props.class)} {...props} />
}

export const AvatarFallback = (props: ArkAvatar.FallbackProps) => {
	return (
		<ArkAvatar.Fallback
			class={twMerge("flex h-full w-full select-none items-center justify-center bg-primary", props.class)}
			{...props}
		/>
	)
}

const Avatar = Object.assign(AvatarMolecule, {
	Root: AvatarRoot,
	Image: AvatarImage,
	Fallback: AvatarFallback,
})

export { Avatar }
