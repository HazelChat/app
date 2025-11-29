"use client"

import { Result, useAtomValue } from "@effect-atom/atom-react"
import { Option } from "effect"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { cn } from "~/lib/utils"
import { Embed, useEmbedTheme } from "../embeds"
import { extractGitHubInfo } from "../link-preview"

interface GitHubPREmbedProps {
	url: string
}

// PR state colors - matches GitHub's design system
const PR_STATE_CONFIG = {
	open: { label: "Open", color: "#238636" },
	closed: { label: "Closed", color: "#da3633" },
	merged: { label: "Merged", color: "#8957e5" },
	draft: { label: "Draft", color: "#6e7681" },
} as const

type PRState = keyof typeof PR_STATE_CONFIG

// Get the effective state of a PR
function getPRState(state: string, merged: boolean, draft: boolean): PRState {
	if (merged) return "merged"
	if (draft) return "draft"
	if (state === "closed") return "closed"
	return "open"
}

// PR Open icon
function PROpenIcon({ className }: { className?: string }) {
	return (
		<svg className={cn("size-4", className)} viewBox="0 0 16 16" fill="currentColor">
			<path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
		</svg>
	)
}

// PR Merged icon
function PRMergedIcon({ className }: { className?: string }) {
	return (
		<svg className={cn("size-4", className)} viewBox="0 0 16 16" fill="currentColor">
			<path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z" />
		</svg>
	)
}

// PR Closed icon
function PRClosedIcon({ className }: { className?: string }) {
	return (
		<svg className={cn("size-4", className)} viewBox="0 0 16 16" fill="currentColor">
			<path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.28a.75.75 0 0 1 1.06 0l.97.97.97-.97a.749.749 0 1 1 1.06 1.06l-.97.97.97.97a.749.749 0 1 1-1.06 1.06l-.97-.97-.97.97a.749.749 0 1 1-1.06-1.06l.97-.97-.97-.97a.75.75 0 0 1 0-1.06ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
		</svg>
	)
}

// PR Draft icon
function PRDraftIcon({ className }: { className?: string }) {
	return (
		<svg className={cn("size-4", className)} viewBox="0 0 16 16" fill="currentColor">
			<path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Zm0-3a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM9.75 7a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Zm0-4a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" />
		</svg>
	)
}

// Status badge component
function PRStatusBadge({ state, merged, draft }: { state: string; merged: boolean; draft: boolean }) {
	const prState = getPRState(state, merged, draft)
	const config = PR_STATE_CONFIG[prState]
	const Icon =
		prState === "merged"
			? PRMergedIcon
			: prState === "closed"
				? PRClosedIcon
				: prState === "draft"
					? PRDraftIcon
					: PROpenIcon

	return (
		<span
			className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[11px]"
			style={{
				backgroundColor: `${config.color}18`,
				color: config.color,
			}}
		>
			<Icon className="size-3" />
			{config.label}
		</span>
	)
}

// Author avatar component
function AuthorAvatar({ login, avatarUrl }: { login: string; avatarUrl?: string | null }) {
	return (
		<div className="flex items-center gap-1.5">
			{avatarUrl ? (
				<img src={avatarUrl} alt="" className="size-5 rounded-full ring-1 ring-border/50" />
			) : (
				<div className="flex size-5 items-center justify-center rounded-full bg-muted font-medium text-[10px] text-muted-fg">
					{login.charAt(0).toUpperCase()}
				</div>
			)}
			<span className="text-muted-fg text-xs">{login}</span>
		</div>
	)
}

// Branch info component
function BranchInfo({ base, head }: { base: string; head: string }) {
	return (
		<div className="flex items-center gap-1 text-[10px] text-muted-fg">
			<span className="truncate rounded bg-muted px-1 py-0.5 font-mono">{head}</span>
			<span>→</span>
			<span className="truncate rounded bg-muted px-1 py-0.5 font-mono">{base}</span>
		</div>
	)
}

// Diff stats component
function DiffStats({
	additions,
	deletions,
	changedFiles,
}: {
	additions: number
	deletions: number
	changedFiles: number
}) {
	return (
		<div className="flex items-center gap-2 font-medium text-[10px]">
			<span className="text-green-600">+{additions}</span>
			<span className="text-red-600">−{deletions}</span>
			<span className="text-muted-fg">
				{changedFiles} {changedFiles === 1 ? "file" : "files"}
			</span>
		</div>
	)
}

// Label badge component
function LabelBadge({ name, color }: { name: string; color: string }) {
	const fullColor = color.startsWith("#") ? color : `#${color}`
	return (
		<span
			className="rounded-full px-1.5 py-0.5 font-medium text-[10px]"
			style={{
				backgroundColor: `${fullColor}30`,
				color: fullColor,
			}}
		>
			{name}
		</span>
	)
}

// Reviewer avatars component
function ReviewerAvatars({
	reviewers,
}: {
	reviewers: readonly { readonly id: number; readonly login: string; readonly avatarUrl: string }[]
}) {
	if (reviewers.length === 0) return null

	return (
		<div className="flex items-center">
			<div className="-space-x-1.5 flex">
				{reviewers.slice(0, 3).map((reviewer) => (
					<img
						key={reviewer.id}
						src={reviewer.avatarUrl}
						alt={reviewer.login}
						title={reviewer.login}
						className="size-4 rounded-full ring-1 ring-bg"
					/>
				))}
			</div>
			{reviewers.length > 3 && (
				<span className="ml-1 text-[10px] text-muted-fg">+{reviewers.length - 3}</span>
			)}
		</div>
	)
}

/**
 * GitHub PR embed that fetches data from the API.
 */
export function GitHubPREmbed({ url }: GitHubPREmbedProps) {
	const theme = useEmbedTheme("github")

	const resourceResult = useAtomValue(
		HazelApiClient.query("integration-resources", "fetchGitHubPR", {
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

		if (Option.isSome(errorOption)) {
			const error = errorOption.value

			// Show connect prompt if not connected
			if ("_tag" in error && error._tag === "IntegrationNotConnectedForPreviewError") {
				const info = extractGitHubInfo(url)
				return (
					<Embed.ConnectPrompt
						providerName={theme.name}
						iconUrl={theme.iconUrl}
						accentColor={theme.color}
						resourceLabel={info ? `#${info.number}` : undefined}
					/>
				)
			}

			// Show specific error message if available
			if ("_tag" in error && error._tag === "ResourceNotFoundError") {
				return (
					<Embed.Error iconUrl={theme.iconUrl} accentColor={theme.color} message="PR not found" />
				)
			}
		}

		return <Embed.Error iconUrl={theme.iconUrl} accentColor={theme.color} />
	}

	const pr = Result.getOrElse(resourceResult, () => null)

	if (!pr) {
		return <Embed.Error iconUrl={theme.iconUrl} accentColor={theme.color} />
	}

	// Build fields array for the footer
	const fields = []

	if (pr.author) {
		fields.push({
			name: "Author",
			value: <AuthorAvatar login={pr.author.login} avatarUrl={pr.author.avatarUrl} />,
			inline: true,
		})
	}

	// Add branch info
	fields.push({
		name: "Branch",
		value: <BranchInfo base={pr.base.ref} head={pr.head.ref} />,
		inline: true,
	})

	// Add changes stats
	fields.push({
		name: "Changes",
		value: <DiffStats additions={pr.additions} deletions={pr.deletions} changedFiles={pr.changedFiles} />,
		inline: true,
	})

	// Add reviewers if any
	if (pr.reviewers.length > 0) {
		fields.push({
			name: "Reviewers",
			value: <ReviewerAvatars reviewers={pr.reviewers} />,
			inline: true,
		})
	}

	// Add labels (max 2, with overflow indicator)
	for (const label of pr.labels.slice(0, 2)) {
		fields.push({
			name: "Label",
			value: <LabelBadge name={label.name} color={label.color} />,
			inline: true,
		})
	}

	if (pr.labels.length > 2) {
		fields.push({
			name: "More",
			value: <span className="text-[10px] text-muted-fg">+{pr.labels.length - 2}</span>,
			inline: true,
		})
	}

	return (
		<Embed accentColor={theme.color} url={url} className="group">
			<Embed.Author
				iconUrl={theme.iconUrl}
				name={`#${pr.number}`}
				trailing={<PRStatusBadge state={pr.state} merged={pr.merged} draft={pr.draft} />}
			/>
			<Embed.Body title={pr.title} description={pr.body} />
			{fields.length > 0 && <Embed.Fields fields={fields} />}
		</Embed>
	)
}
