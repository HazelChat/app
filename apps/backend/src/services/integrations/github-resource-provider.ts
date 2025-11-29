import { Data, Effect } from "effect"

/**
 * GitHub PR URL pattern: https://github.com/{owner}/{repo}/pull/{number}
 * GitHub Issue URL pattern: https://github.com/{owner}/{repo}/issues/{number}
 */
const GITHUB_PR_URL_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i
const GITHUB_ISSUE_URL_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i

// Schema for GitHub user
export interface GitHubUser {
	id: number
	login: string
	avatarUrl: string
}

// Schema for GitHub label
export interface GitHubLabel {
	id: number
	name: string
	color: string
}

// Schema for GitHub reviewer
export interface GitHubReviewer {
	id: number
	login: string
	avatarUrl: string
}

// Schema for GitHub branch
export interface GitHubBranch {
	ref: string
	label: string
}

// Full GitHub PR type
export interface GitHubPR {
	id: number
	number: number
	title: string
	body: string | null
	url: string
	state: string // "open" | "closed"
	merged: boolean
	draft: boolean
	author: GitHubUser | null
	labels: GitHubLabel[]
	reviewers: GitHubReviewer[]
	head: GitHubBranch
	base: GitHubBranch
	additions: number
	deletions: number
	changedFiles: number
	createdAt: string
	updatedAt: string
}

// Error for when GitHub API request fails
export class GitHubApiError extends Data.TaggedError("GitHubApiError")<{
	readonly message: string
	readonly cause?: unknown
}> {}

// Error for when PR is not found
export class GitHubPRNotFoundError extends Data.TaggedError("GitHubPRNotFoundError")<{
	readonly owner: string
	readonly repo: string
	readonly number: number
}> {}

/**
 * Parse a GitHub PR URL to extract owner, repo, and PR number
 */
export const parseGitHubPRUrl = (
	url: string,
): { owner: string; repo: string; number: number } | null => {
	const match = url.match(GITHUB_PR_URL_REGEX)
	if (!match || !match[1] || !match[2] || !match[3]) return null
	return {
		owner: match[1],
		repo: match[2],
		number: Number.parseInt(match[3], 10),
	}
}

/**
 * Parse a GitHub Issue URL to extract owner, repo, and issue number
 */
export const parseGitHubIssueUrl = (
	url: string,
): { owner: string; repo: string; number: number } | null => {
	const match = url.match(GITHUB_ISSUE_URL_REGEX)
	if (!match || !match[1] || !match[2] || !match[3]) return null
	return {
		owner: match[1],
		repo: match[2],
		number: Number.parseInt(match[3], 10),
	}
}

/**
 * Check if a URL is a GitHub PR URL
 */
export const isGitHubPRUrl = (url: string): boolean => {
	return GITHUB_PR_URL_REGEX.test(url)
}

/**
 * Check if a URL is a GitHub Issue URL
 */
export const isGitHubIssueUrl = (url: string): boolean => {
	return GITHUB_ISSUE_URL_REGEX.test(url)
}

/**
 * Fetch a GitHub PR by owner, repo, and number using the provided access token
 */
export const fetchGitHubPR = (
	owner: string,
	repo: string,
	prNumber: number,
	accessToken: string,
): Effect.Effect<GitHubPR, GitHubApiError | GitHubPRNotFoundError> =>
	Effect.gen(function* () {
		// Fetch the PR details
		const prResponse = yield* Effect.tryPromise({
			try: async () => {
				const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: "application/vnd.github+json",
						"User-Agent": "Hazel-App",
						"X-GitHub-Api-Version": "2022-11-28",
					},
				})

				if (res.status === 404) {
					return { notFound: true as const }
				}

				if (!res.ok) {
					throw new Error(`GitHub API returned ${res.status}: ${await res.text()}`)
				}

				return { notFound: false as const, data: await res.json() }
			},
			catch: (error) =>
				new GitHubApiError({
					message: `Failed to fetch GitHub PR: ${String(error)}`,
					cause: error,
				}),
		})

		if (prResponse.notFound) {
			return yield* Effect.fail(new GitHubPRNotFoundError({ owner, repo, number: prNumber }))
		}

		const pr = prResponse.data

		// Fetch requested reviewers separately (the PR endpoint doesn't include all reviewers)
		const reviewersResponse = yield* Effect.tryPromise({
			try: async () => {
				const res = await fetch(
					`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`,
					{
						method: "GET",
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: "application/vnd.github+json",
							"User-Agent": "Hazel-App",
							"X-GitHub-Api-Version": "2022-11-28",
						},
					},
				)

				if (!res.ok) {
					// Non-critical - just return empty reviewers
					return { users: [] as Array<{ id: number; login: string; avatar_url: string }> }
				}

				return res.json() as Promise<{ users: Array<{ id: number; login: string; avatar_url: string }> }>
			},
			catch: () =>
				new GitHubApiError({
					message: "Failed to fetch reviewers",
				}),
		}).pipe(
			Effect.catchAll(() => Effect.succeed({ users: [] as Array<{ id: number; login: string; avatar_url: string }> })),
		)

		// Transform the response
		return {
			id: pr.id,
			number: pr.number,
			title: pr.title,
			body: pr.body ?? null,
			url: pr.html_url,
			state: pr.state,
			merged: pr.merged ?? false,
			draft: pr.draft ?? false,
			author: pr.user
				? {
						id: pr.user.id,
						login: pr.user.login,
						avatarUrl: pr.user.avatar_url,
					}
				: null,
			labels: (pr.labels ?? []).map(
				(label: { id: number; name: string; color: string }) => ({
					id: label.id,
					name: label.name,
					color: label.color,
				}),
			),
			reviewers: (reviewersResponse.users ?? []).map(
				(user: { id: number; login: string; avatar_url: string }) => ({
					id: user.id,
					login: user.login,
					avatarUrl: user.avatar_url,
				}),
			),
			head: {
				ref: pr.head?.ref ?? "",
				label: pr.head?.label ?? "",
			},
			base: {
				ref: pr.base?.ref ?? "",
				label: pr.base?.label ?? "",
			},
			additions: pr.additions ?? 0,
			deletions: pr.deletions ?? 0,
			changedFiles: pr.changed_files ?? 0,
			createdAt: pr.created_at,
			updatedAt: pr.updated_at,
		}
	})
