import { Carousel as ArkCarousel, type CarouselRootProps } from "@ark-ui/solid"
import { type JSX, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export function CarouselRoot(props: CarouselRootProps) {
	const [childProps, restProps] = splitProps(props, ["children", "class"])
	return (
		<ArkCarousel.Root class={twMerge("relative mx-auto w-full", childProps.class)} {...restProps}>
			{childProps.children}
		</ArkCarousel.Root>
	)
}

export function CarouselItemGroup(props: {
	class?: string
	children: JSX.Element
}) {
	return (
		<ArkCarousel.ItemGroup class={twMerge("overflow-hidden rounded-lg shadow-lg", props.class)}>
			{props.children}
		</ArkCarousel.ItemGroup>
	)
}

export function CarouselItem(props: {
	index: number
	class?: string
	children: JSX.Element
}) {
	return (
		<ArkCarousel.Item index={props.index} class={twMerge("flex items-center justify-center", props.class)}>
			{props.children}
		</ArkCarousel.Item>
	)
}

export function CarouselControl(props: {
	class?: string
	children: JSX.Element
}) {
	return (
		<ArkCarousel.Control
			class={twMerge("pointer-events-none absolute inset-0 flex items-center justify-between px-2", props.class)}
		>
			{props.children}
		</ArkCarousel.Control>
	)
}

export function CarouselPrevTrigger(props: {
	class?: string
	children?: any
}) {
	return (
		<ArkCarousel.PrevTrigger
			class={twMerge(
				"pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background shadow transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
				props.class,
			)}
			aria-label="Previous"
		>
			{props.children ?? (
				<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			)}
		</ArkCarousel.PrevTrigger>
	)
}

export function CarouselNextTrigger(props: {
	class?: string
	children?: any
}) {
	return (
		<ArkCarousel.NextTrigger
			class={twMerge(
				"pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background shadow transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
				props.class,
			)}
			aria-label="Next"
		>
			{props.children ?? (
				<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			)}
		</ArkCarousel.NextTrigger>
	)
}

export function CarouselIndicatorGroup(props: {
	class?: string
	children: JSX.Element
}) {
	return (
		<ArkCarousel.IndicatorGroup
			class={twMerge(
				"-translate-x-1/2 absolute bottom-4 left-1/2 flex gap-2 rounded-md bg-muted/50 p-1.5",
				props.class,
			)}
		>
			{props.children}
		</ArkCarousel.IndicatorGroup>
	)
}

export function CarouselIndicator(props: {
	index: number
	class?: string
}) {
	return (
		<ArkCarousel.Indicator
			index={props.index}
			class={twMerge(
				"h-2 w-6 rounded-full bg-muted-foreground/30 transition-all duration-300 ease-in-out data-current:w-8 data-current:bg-primary",
				props.class,
			)}
		/>
	)
}

export const Carousel = Object.assign(CarouselRoot, {
	ItemGroup: CarouselItemGroup,
	Item: CarouselItem,
	Control: CarouselControl,
	PrevTrigger: CarouselPrevTrigger,
	NextTrigger: CarouselNextTrigger,
	IndicatorGroup: CarouselIndicatorGroup,
	Indicator: CarouselIndicator,
})
