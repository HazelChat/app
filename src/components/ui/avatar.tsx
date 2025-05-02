import { Avatar as ArkAvatar } from "@ark-ui/solid"
import { splitProps } from "solid-js"

import { twMerge } from "tailwind-merge"

export const Avatar = (props: ArkAvatar.RootProps & { shape?: "circle" | "square" }) => {
	const [local, rest] = splitProps(props, ["class", "shape"])

	return (
		<ArkAvatar.Root
			class={twMerge(
				"relative flex size-10 shrink-0 overflow-hidden",
				local.shape === "circle" ? "rounded-full" : "rounded-md",
				local.class,
			)}
			{...rest}
		/>
	)
}

export const AvatarImage = (props: ArkAvatar.ImageProps) => {
	return <ArkAvatar.Image class={twMerge("aspect-square h-full w-full", props.class)} {...props} />
}

export const AvatarFallback = (props: ArkAvatar.FallbackProps) => {
	return (
		<ArkAvatar.Fallback
			class={twMerge("flex h-full w-full items-center justify-center bg-primary", props.class)}
			{...props}
		/>
	)
}
