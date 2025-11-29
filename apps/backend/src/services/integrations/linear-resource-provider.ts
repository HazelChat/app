import { Data, Effect, Schema } from "effect"

/**
 * Linear issue URL pattern: https://linear.app/{workspace}/issue/{ISSUE-ID}
 * Example: https://linear.app/acme/issue/ENG-123
 */
const LINEAR_ISSUE_URL_REGEX = /^https:\/\/linear\.app\/([^/]+)\/issue\/([A-Z]+-\d+)/i

/**
 * GraphQL query to fetch full issue details from Linear
 */
const ISSUE_QUERY = `
query GetIssue($issueId: String!) {
  issue(id: $issueId) {
    id
    identifier
    title
    description
    url
    team {
      name
      key
    }
    state {
      id
      name
      color
    }
    assignee {
      id
      name
      avatarUrl
    }
    priority
    priorityLabel
    labels {
      nodes {
        id
        name
        color
      }
    }
  }
}
`

// Schema for Linear team
export const LinearTeam = Schema.Struct({
	name: Schema.String,
	key: Schema.String,
})

// Schema for Linear issue state
export const LinearIssueState = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	color: Schema.String,
})

// Schema for Linear issue assignee
export const LinearIssueAssignee = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	avatarUrl: Schema.NullOr(Schema.String),
})

// Schema for Linear issue label
export const LinearIssueLabel = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	color: Schema.String,
})

// Full Linear issue schema
export const LinearIssue = Schema.Struct({
	id: Schema.String,
	identifier: Schema.String,
	title: Schema.String,
	description: Schema.NullOr(Schema.String),
	url: Schema.String,
	teamName: Schema.String,
	state: Schema.NullOr(LinearIssueState),
	assignee: Schema.NullOr(LinearIssueAssignee),
	priority: Schema.Number,
	priorityLabel: Schema.String,
	labels: Schema.Array(LinearIssueLabel),
})

export type LinearIssue = typeof LinearIssue.Type

// Error for when Linear API request fails
export class LinearApiError extends Data.TaggedError("LinearApiError")<{
	readonly message: string
	readonly cause?: unknown
}> {}

// Error for when issue is not found
export class LinearIssueNotFoundError extends Data.TaggedError("LinearIssueNotFoundError")<{
	readonly issueId: string
}> {}

/**
 * Parse a Linear issue URL to extract workspace and issue key
 */
export const parseLinearIssueUrl = (url: string): { workspace: string; issueKey: string } | null => {
	const match = url.match(LINEAR_ISSUE_URL_REGEX)
	if (!match) return null
	return {
		workspace: match[1],
		issueKey: match[2],
	}
}

/**
 * Check if a URL is a Linear issue URL
 */
export const isLinearIssueUrl = (url: string): boolean => {
	return LINEAR_ISSUE_URL_REGEX.test(url)
}

/**
 * Parse Linear API error to provide user-friendly messages
 */
const parseLinearErrorMessage = (errorMessage: string): string => {
	const lowerMessage = errorMessage.toLowerCase()

	// Entity not found (common when user doesn't have access to workspace)
	if (lowerMessage.includes("entity not found") || lowerMessage.includes("not found")) {
		return "Issue not found or you don't have access"
	}

	// Authentication errors
	if (lowerMessage.includes("unauthorized") || lowerMessage.includes("authentication")) {
		return "Linear authentication failed"
	}

	// Rate limiting
	if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many requests")) {
		return "Rate limit exceeded, try again later"
	}

	// Return original message if no specific case matches
	return errorMessage
}

/**
 * Fetch a Linear issue by its key (e.g., "ENG-123") using the provided access token
 */
export const fetchLinearIssue = (
	issueKey: string,
	accessToken: string,
): Effect.Effect<LinearIssue, LinearApiError | LinearIssueNotFoundError> =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: async () => {
				const res = await fetch("https://api.linear.app/graphql", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						query: ISSUE_QUERY,
						variables: { issueId: issueKey },
					}),
				})

				if (!res.ok) {
					// Handle HTTP-level errors
					if (res.status === 401 || res.status === 403) {
						throw new Error("Linear authentication failed")
					}
					if (res.status === 429) {
						throw new Error("Rate limit exceeded, try again later")
					}
					throw new Error(`Could not connect to Linear (${res.status})`)
				}

				return res.json()
			},
			catch: (error) =>
				new LinearApiError({
					message:
						error instanceof Error ? error.message : "Could not connect to Linear",
					cause: error,
				}),
		})

		// Check for GraphQL errors
		if (response.errors && response.errors.length > 0) {
			const firstError = response.errors[0]?.message || "Unknown error"
			const userFriendlyMessage = parseLinearErrorMessage(firstError)
			return yield* Effect.fail(new LinearApiError({ message: userFriendlyMessage }))
		}

		// Check if issue was found
		const issue = response.data?.issue
		if (!issue) {
			return yield* Effect.fail(new LinearIssueNotFoundError({ issueId: issueKey }))
		}

		// Transform and validate the response
		return {
			id: issue.id,
			identifier: issue.identifier,
			title: issue.title,
			description: issue.description ?? null,
			url: issue.url,
			teamName: issue.team?.name ?? "Linear",
			state: issue.state
				? {
						id: issue.state.id,
						name: issue.state.name,
						color: issue.state.color,
					}
				: null,
			assignee: issue.assignee
				? {
						id: issue.assignee.id,
						name: issue.assignee.name,
						avatarUrl: issue.assignee.avatarUrl ?? null,
					}
				: null,
			priority: issue.priority ?? 0,
			priorityLabel: issue.priorityLabel ?? "No priority",
			labels: (issue.labels?.nodes ?? []).map((label: { id: string; name: string; color: string }) => ({
				id: label.id,
				name: label.name,
				color: label.color,
			})),
		}
	})
