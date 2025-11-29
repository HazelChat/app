"use client"

import { Result, useAtomValue } from "@effect-atom/atom-react"
import { Option } from "effect"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { cn } from "~/lib/utils"
import { LinearConnectPrompt } from "./linear-connect-prompt"

interface LinearIssueEmbedProps {
	url: string
}

// Linear's priority colors - matches their design system
const PRIORITY_CONFIG = {
	0: { label: "No priority", color: "text-fg/40", bg: "bg-fg/5" },
	1: { label: "Urgent", color: "text-red-600", bg: "bg-red-500/10" },
	2: { label: "High", color: "text-orange-600", bg: "bg-orange-500/10" },
	3: { label: "Medium", color: "text-yellow-600", bg: "bg-yellow-500/10" },
	4: { label: "Low", color: "text-blue-600", bg: "bg-blue-500/10" },
} as const

// Priority icon SVG paths
const PriorityIcon = ({ priority, className }: { priority: number; className?: string }) => {
	const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG[0]

	if (priority === 0) {
		return (
			<svg className={cn("size-3.5", config.color, className)} viewBox="0 0 16 16" fill="currentColor">
				<rect x="1" y="8" width="3" height="6" rx="1" opacity="0.4" />
				<rect x="6" y="5" width="3" height="9" rx="1" opacity="0.4" />
				<rect x="11" y="2" width="3" height="12" rx="1" opacity="0.4" />
			</svg>
		)
	}

	const bars = priority === 1 ? 3 : priority === 2 ? 2 : priority === 3 ? 1 : 0

	return (
		<svg className={cn("size-3.5", config.color, className)} viewBox="0 0 16 16" fill="currentColor">
			<rect x="1" y="8" width="3" height="6" rx="1" opacity={bars >= 1 ? 1 : 0.3} />
			<rect x="6" y="5" width="3" height="9" rx="1" opacity={bars >= 2 ? 1 : 0.3} />
			<rect x="11" y="2" width="3" height="12" rx="1" opacity={bars >= 3 ? 1 : 0.3} />
		</svg>
	)
}

// Linear logo - using Brandfetch CDN
const LINEAR_LOGO_URL = "https://cdn.brandfetch.io/linear.app/w/64/h/64/theme/dark/icon"

// Loading skeleton
function LinearIssueSkeleton() {
	return (
		<div className="mt-2 flex max-w-md flex-col overflow-hidden rounded-lg border border-border/60 bg-linear-to-br from-muted/30 to-muted/50">
			{/* Header skeleton */}
			<div className="flex items-center gap-2 border-border/40 border-b bg-muted/20 px-3 py-2">
				<div className="size-4 animate-pulse rounded bg-muted" />
				<div className="h-4 w-16 animate-pulse rounded bg-muted" />
				<div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
			</div>
			{/* Content skeleton */}
			<div className="space-y-2 p-3">
				<div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
				<div className="h-3 w-full animate-pulse rounded bg-muted" />
				<div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
			</div>
			{/* Footer skeleton */}
			<div className="flex items-center gap-3 border-border/40 border-t bg-muted/10 px-3 py-2">
				<div className="flex items-center gap-1.5">
					<div className="size-5 animate-pulse rounded-full bg-muted" />
					<div className="h-3 w-16 animate-pulse rounded bg-muted" />
				</div>
				<div className="h-4 w-12 animate-pulse rounded bg-muted" />
			</div>
		</div>
	)
}

// Error state
function LinearIssueError({ message }: { message?: string }) {
	return (
		<div className="mt-2 flex max-w-md items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
			<img src={LINEAR_LOGO_URL} alt="" className="size-5 opacity-50" />
			<span className="text-muted-fg text-sm">{message || "Could not load Linear issue"}</span>
		</div>
	)
}

export function LinearIssueEmbed({ url }: LinearIssueEmbedProps) {
	const resourceResult = useAtomValue(
		HazelApiClient.query("integration-resources", "fetchLinearIssue", {
			urlParams: { url },
		}),
	)

	const isLoading = Result.isInitial(resourceResult)

	if (isLoading) {
		return <LinearIssueSkeleton />
	}

	// Handle errors
	if (Result.isFailure(resourceResult)) {
		const errorOption = Result.error(resourceResult)

		// Unwrap the Option to get the actual error
		if (Option.isSome(errorOption)) {
			const error = errorOption.value

			// Show connect prompt if not connected
			if ("_tag" in error && error._tag === "IntegrationNotConnectedForPreviewError") {
				return <LinearConnectPrompt url={url} />
			}

			// Show specific error message if available
			if ("_tag" in error && error._tag === "ResourceNotFoundError") {
				return <LinearIssueError message="Issue not found" />
			}
		}

		return <LinearIssueError />
	}

	const issue = Result.getOrElse(resourceResult, () => null)

	if (!issue) {
		return <LinearIssueError />
	}

	const priorityConfig =
		PRIORITY_CONFIG[issue.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG[0]

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="group mt-2 block max-w-md overflow-hidden rounded-lg border border-border/60 bg-linear-to-br from-bg to-muted/20 shadow-sm transition-all duration-200 hover:border-[#5E6AD2]/40 hover:shadow-md"
		>
			{/* Header with Linear branding */}
			<div className="flex items-center gap-2 border-border/40 border-b bg-linear-to-r from-[#5E6AD2]/5 to-transparent px-3 py-2">
				<img src={LINEAR_LOGO_URL} alt="" className="size-4" />
				<span className="font-medium font-mono text-[#5E6AD2] text-xs">{issue.identifier}</span>
				{issue.state && (
					<span
						className="ml-auto rounded-full px-2 py-0.5 font-medium text-[11px] transition-transform group-hover:scale-105"
						style={{
							backgroundColor: `${issue.state.color}18`,
							color: issue.state.color,
						}}
					>
						{issue.state.name}
					</span>
				)}
			</div>

			{/* Main content */}
			<div className="p-3">
				<h4 className="font-semibold text-fg text-sm leading-snug transition-colors group-hover:text-[#5E6AD2]">
					{issue.title}
				</h4>
				{issue.description && (
					<p className="mt-1.5 line-clamp-2 text-muted-fg text-xs leading-relaxed">
						{issue.description.slice(0, 200)}
						{issue.description.length > 200 ? "..." : ""}
					</p>
				)}
			</div>

			{/* Footer with metadata */}
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-border/40 border-t bg-muted/10 px-3 py-2">
				{/* Assignee */}
				{issue.assignee && (
					<div className="flex items-center gap-1.5">
						{issue.assignee.avatarUrl ? (
							<img
								src={issue.assignee.avatarUrl}
								alt=""
								className="size-5 rounded-full ring-1 ring-border/50"
							/>
						) : (
							<div className="flex size-5 items-center justify-center rounded-full bg-linear-to-br from-[#5E6AD2] to-[#7C3AED] font-medium text-[10px] text-white">
								{issue.assignee.name.charAt(0).toUpperCase()}
							</div>
						)}
						<span className="text-muted-fg text-xs">{issue.assignee.name}</span>
					</div>
				)}

				{/* Priority */}
				{issue.priority > 0 && (
					<div
						className={cn(
							"flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px]",
							priorityConfig.bg,
							priorityConfig.color,
						)}
					>
						<PriorityIcon priority={issue.priority} />
						<span>{issue.priorityLabel}</span>
					</div>
				)}

				{/* Labels */}
				{issue.labels.slice(0, 2).map((label) => (
					<span
						key={label.id}
						className="rounded px-1.5 py-0.5 font-medium text-[10px]"
						style={{
							backgroundColor: `${label.color}18`,
							color: label.color,
						}}
					>
						{label.name}
					</span>
				))}
				{issue.labels.length > 2 && (
					<span className="text-[10px] text-muted-fg">+{issue.labels.length - 2}</span>
				)}
			</div>
		</a>
	)
}
