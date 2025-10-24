"use client"

import { PlateElement, type PlateElementProps, useEditorRef } from "platejs/react"
import { cn } from "~/lib/utils"

export function CodeBlockElement({ className, ...props }: PlateElementProps) {
	const _editor = useEditorRef()
	const { children, element } = props

	// Get language from element node
	const language = (element as any).lang || "plaintext"

	return (
		<PlateElement
			{...props}
			as="pre"
			className={cn("my-2 overflow-x-auto rounded-lg bg-tertiary p-4 font-mono text-sm", className)}
		>
			<code className={cn("block", `language-${language}`)}>{children}</code>
		</PlateElement>
	)
}
