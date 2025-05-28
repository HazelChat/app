import type { Component, JSX } from "solid-js"
import { splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

type CardProps = JSX.HTMLAttributes<HTMLDivElement>

const CardRoot: Component<CardProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div class={twMerge("rounded-xl border bg-card text-card-foreground shadow", local.class)} {...rest} />
}

type CardHeaderProps = JSX.HTMLAttributes<HTMLDivElement>

const CardHeader: Component<CardHeaderProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div class={twMerge("flex flex-col space-y-1.5 p-6", local.class)} {...rest} />
}

type CardTitleProps = JSX.HTMLAttributes<HTMLHeadingElement>

const CardTitle: Component<CardTitleProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <h3 class={twMerge("font-semibold leading-none tracking-tight", local.class)} {...rest} />
}

type CardDescriptionProps = JSX.HTMLAttributes<HTMLParagraphElement>

const CardDescription: Component<CardDescriptionProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <p class={twMerge("text-muted-foreground text-sm", local.class)} {...rest} />
}

type CardContentProps = JSX.HTMLAttributes<HTMLDivElement>

const CardContent: Component<CardContentProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div class={twMerge("p-6 pt-0", local.class)} {...rest} />
}

type CardFooterProps = JSX.HTMLAttributes<HTMLDivElement>

const CardFooter: Component<CardFooterProps> = (props) => {
	const [local, rest] = splitProps(props, ["class"])
	return <div class={twMerge("flex items-center p-6 pt-0", local.class)} {...rest} />
}

export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

export const Card = Object.assign(CardRoot, {
	Header: CardHeader,
	Footer: CardFooter,
	Title: CardTitle,
	Description: CardDescription,
	Content: CardContent,
})
