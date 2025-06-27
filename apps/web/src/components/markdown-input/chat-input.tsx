import { type Accessor, type JSX, onMount, splitProps } from "solid-js"
import { MarkdownInput } from "./markdown-input"
import { useKeyboardSounds } from "~/lib/keyboard-sounds"

import { highlight } from "sugar-high"

export interface ChatInputProps extends JSX.HTMLAttributes<HTMLDivElement> {
	value: Accessor<string>
	onValueChange: (value: string) => void
}

export const ChatInput = (props: ChatInputProps) => {
	const [baseProps, divProps] = splitProps(props, ["class", "value", "onValueChange"])
	const { playSound } = useKeyboardSounds()
	
	const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
		const isPrintableKey = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey
		if (isPrintableKey || event.key === "Backspace" || event.key === "Delete") {
			playSound()
		}
	}
	
	return (
		<MarkdownInput
			class="w-full py-3 outline-none"
			value={baseProps.value}
			onValueChange={baseProps.onValueChange}
			onKeyDown={handleKeyDown}
			renderers={{
				header1: (token) => <h1 class="font-bold text-xl">{token.content}</h1>,
				header2: (token) => <h2 class="font-bold text-lg">{token.content}</h2>,

				// Styles
				bold: (token) => <strong class="font-bold">{token.content}</strong>,
				italic: (token) => <em class="italic">{token.content}</em>,
				strikethrough: (token) => <span class="line-through">{token.content}</span>,

				//
				// codeblock: (token) => {
				// 	console.log(token.content)

				// 	const html = highlight(token.content)

				// 	return <span innerHTML={html} />
				// },
				// inlinecode: (token) => {
				// 	console.log(token.content)

				// 	const html = highlight(token.content)

				// 	return <span innerHTML={html} />
				// },
				default: (token) => <span>{token.content}</span>,
			}}
			{...divProps}
		/>
	)
}
