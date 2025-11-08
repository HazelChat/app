import { useState } from "react"
import type { RenderElementProps } from "slate-react"
import IconCheck from "~/components/icons/icon-check"
import IconCopy from "~/components/icons/icon-copy"

export interface CodeBlockElementProps extends RenderElementProps {
	/** Whether to show copy button and language badge (default: true) */
	showControls?: boolean
}

export function CodeBlockElement({ attributes, children, element, showControls = true }: CodeBlockElementProps) {
	const [copied, setCopied] = useState(false)

	// Extract the text content from the code block
	const codeText = element.children.map((child: any) => child.text).join("")
	const language = (element as any).language || "plaintext"

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(codeText)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			console.error("Failed to copy code")
		}
	}

	return (
		<div {...attributes} className="group relative my-2">
			{showControls && (
				<div className="absolute right-2 top-2 z-10 flex items-center gap-2">
					{language && language !== "plaintext" && (
						<span className="rounded-md bg-info-subtle px-2 py-0.5 text-xs font-medium text-info-subtle-fg">
							{language}
						</span>
					)}
					<button
						type="button"
						onClick={handleCopy}
						className="rounded bg-accent-9/10 p-1.5 opacity-0 transition-opacity hover:bg-accent-9/20 group-hover:opacity-100"
						contentEditable={false}
						title="Copy code"
					>
						{copied ? (
							<IconCheck data-slot="icon" className="size-3.5 text-green-11" />
						) : (
							<IconCopy data-slot="icon" className="size-3.5" />
						)}
					</button>
				</div>
			)}
			<pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 pr-24 font-mono text-sm">
				<code>{children}</code>
			</pre>
		</div>
	)
}
