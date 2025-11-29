import { HttpApiBuilder } from "@effect/platform"
import { CurrentUser, InternalServerError, UnauthorizedError, withSystemActor } from "@hazel/domain"
import {
	IntegrationNotConnectedForPreviewError,
	IntegrationResourceError,
	LinearIssueResourceResponse,
	ResourceNotFoundError,
} from "@hazel/domain/http"
import { Effect, Option } from "effect"
import { HazelApi } from "../api"
import { IntegrationConnectionRepo } from "../repositories/integration-connection-repo"
import { IntegrationTokenService, TokenNotFoundError } from "../services/integration-token-service"
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
		handlers.handle("fetchLinearIssue", ({ urlParams }) =>
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
					teamName: issue.teamName,
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
							new IntegrationResourceError({
								url: urlParams.url,
								message: error.message,
								provider: "linear",
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
		),
)
