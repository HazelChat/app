"use client"

import { Link, useParams } from "@tanstack/react-router"

// Linear logo - using Brandfetch CDN
const LINEAR_LOGO_URL = "https://cdn.brandfetch.io/linear.app/w/64/h/64/theme/dark/icon"

interface LinearConnectPromptProps {
	url: string
}

export function LinearConnectPrompt({ url }: LinearConnectPromptProps) {
	// Get orgSlug from any route that has it (with strict: false to work from child routes)
	const params = useParams({ strict: false }) as { orgSlug?: string }
	const orgSlug = params.orgSlug

	// Extract issue key for display
	const issueKey = url.match(/\/issue\/([A-Z]+-\d+)/i)?.[1]?.toUpperCase()

	return (
		<div className="mt-2 flex max-w-md items-center gap-3 overflow-hidden rounded-lg border border-[#5E6AD2]/30 border-dashed bg-linear-to-r from-[#5E6AD2]/5 to-transparent p-3 transition-colors hover:border-[#5E6AD2]/50 hover:bg-[#5E6AD2]/5">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#5E6AD2]/10">
				<img src={LINEAR_LOGO_URL} alt="" className="size-5" />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="font-medium text-fg text-sm">Connect Linear to preview</p>
					{issueKey && (
						<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-fg">
							{issueKey}
						</span>
					)}
				</div>
				<p className="mt-0.5 text-muted-fg text-xs">
					Link your Linear workspace to see issue details inline
				</p>
			</div>

			{orgSlug && (
				<Link
					to="/$orgSlug/settings/integrations"
					params={{ orgSlug }}
					className="shrink-0 rounded-md bg-[#5E6AD2] px-3 py-1.5 font-medium text-white text-xs shadow-sm transition-all hover:bg-[#4F5BC7] hover:shadow-md active:scale-95"
				>
					Connect
				</Link>
			)}
		</div>
	)
}
