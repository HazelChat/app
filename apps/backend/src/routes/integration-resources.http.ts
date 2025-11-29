import { HttpApiBuilder } from "@effect/platform"
import { CurrentUser, InternalServerError, UnauthorizedError, withSystemActor } from "@hazel/domain"
import {
	GitHubPRResourceResponse,
	IntegrationNotConnectedForPreviewError,
	LinearIssueResourceResponse,
	ResourceNotFoundError,
} from "@hazel/domain/http"
import { Effect, Option } from "effect"
import { HazelApi } from "../api"
import { IntegrationConnectionRepo } from "../repositories/integration-connection-repo"
import { IntegrationTokenService, TokenNotFoundError } from "../services/integration-token-service"
import {
	fetchGitHubPR,
	type GitHubApiError,
	type GitHubPRNotFoundError,
	parseGitHubPRUrl,
} from "../services/integrations/github-resource-provider"
import {
	fetchLinearIssue,
	type LinearApiError,
	type LinearIssueNotFoundError,
	parseLinearIssueUrl,
} from "../services/integrations/linear-resource-provider"

export const HttpIntegrationResourceLive = HttpApiBuilder.group(
	HazelApi,
	"integration-resources",
	(handlers) =>
		handlers
			.handle("fetchLinearIssue", ({ urlParams }) =>
				Effect.gen(function* () {
					const currentUser = yield* CurrentUser.Context
					const { url } = urlParams

					// Must have organization context
					if (!currentUser.organizationId) {
						return yield* Effect.fail(
							new UnauthorizedError({
								message: "Must be in an organization context to preview integrations",
								detail: "No organizationId found in session",
							}),
						)
					}

					// Parse the Linear issue URL
					const parsed = parseLinearIssueUrl(url)
					if (!parsed) {
						return yield* Effect.fail(
							new ResourceNotFoundError({
								url,
								message: "Invalid Linear issue URL format",
							}),
						)
					}

					// Check if organization has Linear connected
					const connectionRepo = yield* IntegrationConnectionRepo
					const connectionOption = yield* connectionRepo
						.findByOrgAndProvider(currentUser.organizationId, "linear")
						.pipe(withSystemActor)

					if (Option.isNone(connectionOption)) {
						return yield* Effect.fail(
							new IntegrationNotConnectedForPreviewError({ provider: "linear" }),
						)
					}

					const connection = connectionOption.value

					// Check if connection is active
					if (connection.status !== "active") {
						return yield* Effect.fail(
							new IntegrationNotConnectedForPreviewError({ provider: "linear" }),
						)
					}

					// Get valid access token
					const tokenService = yield* IntegrationTokenService
					const accessToken = yield* tokenService.getValidAccessToken(connection.id)

					// Fetch issue from Linear API
					const issue = yield* fetchLinearIssue(parsed.issueKey, accessToken)

					// Transform to response
					return new LinearIssueResourceResponse({
						id: issue.id,
						identifier: issue.identifier,
						title: issue.title,
						description: issue.description,
						url: issue.url,
						state: issue.state,
						assignee: issue.assignee,
						priority: issue.priority,
						priorityLabel: issue.priorityLabel,
						labels: issue.labels,
					})
				}).pipe(
					Effect.catchTags({
						TokenNotFoundError: () =>
							Effect.fail(new IntegrationNotConnectedForPreviewError({ provider: "linear" })),
						LinearApiError: (error: LinearApiError) =>
							Effect.fail(
								new InternalServerError({
									message: "Failed to fetch issue from Linear",
									detail: error.message,
								}),
							),
						LinearIssueNotFoundError: (error: LinearIssueNotFoundError) =>
							Effect.fail(
								new ResourceNotFoundError({
									url: urlParams.url,
									message: `Issue not found: ${error.issueId}`,
								}),
							),
						DatabaseError: (error) =>
							Effect.fail(
								new InternalServerError({
									message: "Database error while fetching integration",
									detail: String(error),
								}),
							),
						IntegrationEncryptionError: (error) =>
							Effect.fail(
								new InternalServerError({
									message: "Failed to decrypt integration token",
									detail: String(error),
								}),
							),
						KeyVersionNotFoundError: (error) =>
							Effect.fail(
								new InternalServerError({
									message: "Encryption key version not found",
									detail: String(error),
								}),
							),
						TokenRefreshError: () =>
							Effect.fail(new IntegrationNotConnectedForPreviewError({ provider: "linear" })),
						ConnectionNotFoundError: () =>
							Effect.fail(new IntegrationNotConnectedForPreviewError({ provider: "linear" })),
					}),
				),
			)
			.handle("fetchGitHubPR", ({ urlParams }) =>
				Effect.gen(function* () {
					const currentUser = yield* CurrentUser.Context
					const { url } = urlParams

					// Must have organization context
					if (!currentUser.organizationId) {
						return yield* Effect.fail(
							new UnauthorizedError({
								message: "Must be in an organization context to preview integrations",
								detail: "No organizationId found in session",
							}),
						)
					}

					// Parse the GitHub PR URL
					const parsed = parseGitHubPRUrl(url)
					if (!parsed) {
						return yield* Effect.fail(
							new ResourceNotFoundError({
								url,
								message: "Invalid GitHub PR URL format",
							}),
						)
					}

					// Check if organization has GitHub connected
					const connectionRepo = yield* IntegrationConnectionRepo
					const connectionOption = yield* connectionRepo
						.findByOrgAndProvider(currentUser.organizationId, "github")
						.pipe(withSystemActor)

					if (Option.isNone(connectionOption)) {
						return yield* Effect.fail(
							new IntegrationNotConnectedForPreviewError({ provider: "github" }),
						)
					}

					const connection = connectionOption.value

					// Check if connection is active
					if (connection.status !== "active") {
						return yield* Effect.fail(
							new IntegrationNotConnectedForPreviewError({ provider: "github" }),
						)
					}

					// Get valid access token
					const tokenService = yield* IntegrationTokenService
					const accessToken = yield* tokenService.getValidAccessToken(connection.id)

					// Fetch PR from GitHub API
					const pr = yield* fetchGitHubPR(parsed.owner, parsed.repo, parsed.number, accessToken)

					// Transform to response
					return new GitHubPRResourceResponse({
						id: pr.id,
						number: pr.number,
						title: pr.title,
						body: pr.body,
						url: pr.url,
						state: pr.state,
						merged: pr.merged,
						draft: pr.draft,
						author: pr.author,
						labels: pr.labels,
						reviewers: pr.reviewers,
						head: pr.head,
						base: pr.base,
						additions: pr.additions,
						deletions: pr.deletions,
						changedFiles: pr.changedFiles,
						createdAt: pr.createdAt,
						updatedAt: pr.updatedAt,
					})
				}).pipe(
					Effect.catchTags({
						TokenNotFoundError: () =>
							Effect.fail(new IntegrationNotConnectedForPreviewError({ provider: "github" })),
						GitHubApiError: (error: GitHubApiError) =>
							Effect.fail(
								new InternalServerError({
									message: "Failed to fetch PR from GitHub",
									detail: error.message,
								}),
							),
						GitHubPRNotFoundError: (error: GitHubPRNotFoundError) =>
							Effect.fail(
								new ResourceNotFoundError({
									url: urlParams.url,
									message: `PR not found: ${error.owner}/${error.repo}#${error.number}`,
								}),
							),
						DatabaseError: (error) =>
							Effect.fail(
								new InternalServerError({
									message: "Database error while fetching integration",
									detail: String(error),
								}),
							),
						IntegrationEncryptionError: (error) =>
							Effect.fail(
								new InternalServerError({
									message: "Failed to decrypt integration token",
									detail: String(error),
								}),
							),
						KeyVersionNotFoundError: (error) =>
							Effect.fail(
								new InternalServerError({
									message: "Encryption key version not found",
									detail: String(error),
								}),
							),
						TokenRefreshError: () =>
							Effect.fail(new IntegrationNotConnectedForPreviewError({ provider: "github" })),
						ConnectionNotFoundError: () =>
							Effect.fail(new IntegrationNotConnectedForPreviewError({ provider: "github" })),
					}),
				),
			),
)
