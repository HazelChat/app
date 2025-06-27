import { ContentEditable } from "@bigmistqke/solid-contenteditable"
import { type Accessor, For, type JSX, Show, createSignal, splitProps } from "solid-js"
import { Dynamic } from "solid-js/web"
import { type BaseTokenType, type Token, type TokenPattern, parseMarkdownTokens } from "./parser"

type TokenRenderer<T extends string> = (token: Token<T>) => JSX.Element

type RenderFunctions<T extends string> = {
	[K in T]?: TokenRenderer<K>
} & {
	default?: TokenRenderer<T>
}

interface BasicHighlightInputProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "value"> {
	value: Accessor<string>
	onValueChange: (value: string) => void
	placeholder?: string
	onKeyDown?: JSX.EventHandlerUnion<HTMLDivElement, KeyboardEvent>
}

interface MarkdownInputProps<CustomTokenType extends string = never> extends BasicHighlightInputProps {
	additionalPatterns?: TokenPattern<CustomTokenType>[]
	renderers?: RenderFunctions<BaseTokenType | CustomTokenType>
}

export function MarkdownInput<CustomTokenType extends string = never>(
	props: MarkdownInputProps<CustomTokenType>,
) {
	const [baseProps, divProps] = splitProps(props, [
		"value",
		"onValueChange",
		"placeholder",
		"additionalPatterns",
		"renderers",
		"onKeyDown",
	])
	return (
		<ContentEditable
			// @ts-expect-error
			textContent={baseProps.value()}
			aria-placeholder={baseProps.placeholder}
			render={(value) => {
				const blocks = parseMarkdownTokens(value(), baseProps.additionalPatterns || [])

				return (
					<For each={blocks}>
						{(block) => {
							const comp = baseProps.renderers?.[block.type]
							if (comp) {
								return <Dynamic component={comp} {...(block as any)} />
							}

							if (baseProps.renderers?.default) {
								return baseProps.renderers.default(block)
							}

							return <span>{block.content}</span>
						}}
					</For>
				)
			}}
			onTextContent={baseProps.onValueChange}
			onKeyDown={baseProps.onKeyDown}
			{...divProps}
		/>
	)
}
