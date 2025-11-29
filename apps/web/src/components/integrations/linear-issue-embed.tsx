"use client"

import { Result, useAtomValue } from "@effect-atom/atom-react"
import { Option } from "effect"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { cn } from "~/lib/utils"
import { Embed, embedSectionStyles, useEmbedTheme } from "../embeds"
import { extractLinearIssueKey } from "../link-preview"

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

// Priority icon SVG
function PriorityIcon({ priority, className }: { priority: number; className?: string }) {
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

// Status badge component
function StatusBadge({ name, color }: { name: string; color: string }) {
	return (
		<span
			className="rounded-full px-2 py-0.5 font-medium text-[11px] transition-transform group-hover:scale-105"
			style={{
				backgroundColor: `${color}18`,
				color: color,
			}}
		>
			{name}
		</span>
	)
}

// Assignee avatar component
function AssigneeAvatar({
	name,
	avatarUrl,
	accentColor,
}: {
	name: string
	avatarUrl?: string | null
	accentColor: string
}) {
	return (
		<div className="flex items-center gap-1.5">
			{avatarUrl ? (
				<img src={avatarUrl} alt="" className="size-5 rounded-full ring-1 ring-border/50" />
			) : (
				<div
					className="flex size-5 items-center justify-center rounded-full font-medium text-[10px] text-white"
					style={{
						background: `linear-gradient(to bottom right, ${accentColor}, #7C3AED)`,
					}}
				>
					{name.charAt(0).toUpperCase()}
				</div>
			)}
			<span className="text-muted-fg text-xs">{name}</span>
		</div>
	)
}

// Priority badge component
function PriorityBadge({ priority, label }: { priority: number; label: string }) {
	const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG[0]

	return (
		<div
			className={cn(
				"flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px]",
				config.bg,
				config.color,
			)}
		>
			<PriorityIcon priority={priority} />
			<span>{label}</span>
		</div>
	)
}

// Label badge component
function LabelBadge({ name, color }: { name: string; color: string }) {
	return (
		<span
			className="rounded px-1.5 py-0.5 font-medium text-[10px]"
			style={{
				backgroundColor: `${color}18`,
				color: color,
			}}
		>
			{name}
		</span>
	)
}

export function LinearIssueEmbed({ url }: LinearIssueEmbedProps) {
	const theme = useEmbedTheme("linear")

	const resourceResult = useAtomValue(
		HazelApiClient.query("integration-resources", "fetchLinearIssue", {
			urlParams: { url },
		}),
	)

	// Loading state
	if (Result.isInitial(resourceResult)) {
		return <Embed.Skeleton accentColor={theme.color} />
	}

	// Error handling
	if (Result.isFailure(resourceResult)) {
		const errorOption = Result.error(resourceResult)
		const issueKey = extractLinearIssueKey(url)

		if (Option.isSome(errorOption)) {
			const error = errorOption.value

			// Show connect prompt if not connected
			if ("_tag" in error && error._tag === "IntegrationNotConnectedForPreviewError") {
				return (
					<Embed.ConnectPrompt
						providerName={theme.name}
						iconUrl={theme.iconUrl}
						accentColor={theme.color}
						resourceLabel={issueKey ?? undefined}
					/>
				)
			}

			// Show the actual error message from the integration
			if ("_tag" in error && error._tag === "IntegrationResourceError") {
				return (
					<Embed.Error
						iconUrl={theme.iconUrl}
						accentColor={theme.color}
						message={error.message}
						url={url}
						resourceLabel={issueKey ?? undefined}
					/>
				)
			}

			// Show specific error message for not found
			if ("_tag" in error && error._tag === "ResourceNotFoundError") {
				return (
					<Embed.Error
						iconUrl={theme.iconUrl}
						accentColor={theme.color}
						message={error.message ?? "Issue not found"}
						url={url}
						resourceLabel={issueKey ?? undefined}
					/>
				)
			}
		}

		// Fallback for unknown errors
		return (
			<Embed.Error
				iconUrl={theme.iconUrl}
				accentColor={theme.color}
				message="Could not load content"
				url={url}
				resourceLabel={issueKey ?? undefined}
			/>
		)
	}

	const issue = Result.getOrElse(resourceResult, () => null)

	if (!issue) {
		const issueKey = extractLinearIssueKey(url)
		return (
			<Embed.Error
				iconUrl={theme.iconUrl}
				accentColor={theme.color}
				message="Issue not found"
				url={url}
				resourceLabel={issueKey ?? undefined}
			/>
		)
	}

	// Build fields array for priority and labels
	const fields = []

	if (issue.priority > 0) {
		fields.push({
			name: "Priority",
			value: <PriorityBadge priority={issue.priority} label={issue.priorityLabel} />,
			inline: true,
		})
	}

	// Add labels (max 2, with overflow indicator)
	for (const label of issue.labels.slice(0, 2)) {
		fields.push({
			name: "Label",
			value: <LabelBadge name={label.name} color={label.color} />,
			inline: true,
		})
	}

	if (issue.labels.length > 2) {
		fields.push({
			name: "More",
			value: <span className="text-[10px] text-muted-fg">+{issue.labels.length - 2}</span>,
			inline: true,
		})
	}

	return (
		<Embed accentColor={theme.color} url={url} className="group">
			<Embed.Author
				iconUrl={theme.iconUrl}
				name={
					<span className="flex items-center gap-1.5">
						<span className="text-muted-fg">{issue.teamName}</span>
						<span className="text-muted-fg/50">/</span>
						<span>{issue.identifier}</span>
					</span>
				}
				trailing={issue.state && <StatusBadge name={issue.state.name} color={issue.state.color} />}
			/>
			<Embed.Body title={issue.title} description={issue.description} />
			{fields.length > 0 && <Embed.Fields fields={fields} />}
			{issue.assignee && (
				<div className={cn(embedSectionStyles({ position: "bottom" }), "bg-muted/20")}>
					<AssigneeAvatar
						name={issue.assignee.name}
						avatarUrl={issue.assignee.avatarUrl}
						accentColor={theme.color}
					/>
				</div>
			)}
		</Embed>
	)
}
