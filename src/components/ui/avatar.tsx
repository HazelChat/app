import { Avatar as ArkAvatar } from "@ark-ui/solid"

import { twMerge } from "tailwind-merge"

export const Avatar = (props: ArkAvatar.RootProps) => {
	return (
		<ArkAvatar.Root
			class={twMerge("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", props.class)}
			{...props}
		/>
	)
}

export const AvatarImage = (props: ArkAvatar.ImageProps) => {
	return <ArkAvatar.Image class={twMerge("aspect-square h-full w-full", props.class)} {...props} />
}

export const AvatarFallback = (props: ArkAvatar.FallbackProps) => {
	return (
		<ArkAvatar.Fallback
			class={twMerge("flex h-full w-full items-center justify-center rounded-full bg-muted", props.class)}
			{...props}
		/>
	)
}
