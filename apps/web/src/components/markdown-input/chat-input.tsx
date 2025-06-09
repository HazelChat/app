import { type Accessor, type JSX, onMount, splitProps } from "solid-js"
import { MarkdownInput } from "./markdown-input"

export interface ChatInputProps extends JSX.HTMLAttributes<HTMLDivElement> {
	value: Accessor<string>
	onValueChange: (value: string) => void
}

export const ChatInput = (props: ChatInputProps) => {
	const [baseProps, divProps] = splitProps(props, ["class", "value", "onValueChange"])
	return (
		<MarkdownInput
			class="w-full py-3 outline-none"
			value={baseProps.value}
			onValueChange={baseProps.onValueChange}
			renderers={{
				header1: (token) => <h1 class="font-bold text-xl">{token.content}</h1>,
				header2: (token) => <h2 class="font-bold text-lg">{token.content}</h2>,

				// Styles
				bold: (token) => <strong class="font-bold">{token.content}</strong>,
				italic: (token) => <em class="italic">{token.content}</em>,
				strikethrough: (token) => <span class="line-through">{token.content}</span>,

				//
				codeblock: (token) => {
					console.log(token)

					// return <code innerHTML={codeHTML} />
					return <div>WOW</div>
				},
				inlinecode: (token) => <span class="rounded-md bg-muted p-0.5">{token.content}</span>,
				default: (token) => <span>{token.content}</span>,
			}}
			{...divProps}
		/>
	)
}
