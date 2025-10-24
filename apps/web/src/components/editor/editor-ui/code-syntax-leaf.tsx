"use client"

import type { PlateLeafProps } from "platejs/react"
import { PlateLeaf } from "platejs/react"
import { cn } from "~/lib/utils"

export function CodeSyntaxLeaf({ className, ...props }: PlateLeafProps) {
	const { children, leaf } = props

	// Get the token type from the leaf node
	const tokenType = (leaf as any).tokenType as string | undefined

	return (
		<PlateLeaf
			{...props}
			as="span"
			className={cn("text-inherit", tokenType && `token ${tokenType}`, className)}
		>
			{children}
		</PlateLeaf>
	)
}
