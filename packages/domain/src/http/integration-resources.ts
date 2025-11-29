import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import * as CurrentUser from "../current-user"
import { InternalServerError, UnauthorizedError } from "../errors"
import { IntegrationConnection } from "../models"

// Provider type from the model
const IntegrationProvider = IntegrationConnection.IntegrationProvider

// Linear issue state schema
const LinearIssueStateResponse = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	color: Schema.String,
})

// Linear issue assignee schema
const LinearIssueAssigneeResponse = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	avatarUrl: Schema.NullOr(Schema.String),
})

// Linear issue label schema
const LinearIssueLabelResponse = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	color: Schema.String,
})

// Full Linear issue response
export class LinearIssueResourceResponse extends Schema.Class<LinearIssueResourceResponse>(
	"LinearIssueResourceResponse",
)({
	id: Schema.String,
	identifier: Schema.String,
	title: Schema.String,
	description: Schema.NullOr(Schema.String),
	url: Schema.String,
	state: Schema.NullOr(LinearIssueStateResponse),
	assignee: Schema.NullOr(LinearIssueAssigneeResponse),
	priority: Schema.Number,
	priorityLabel: Schema.String,
	labels: Schema.Array(LinearIssueLabelResponse),
}) {}

// GitHub PR/Issue user schema
const GitHubUserResponse = Schema.Struct({
	id: Schema.Number,
	login: Schema.String,
	avatarUrl: Schema.String,
})

// GitHub PR/Issue label schema
const GitHubLabelResponse = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	color: Schema.String,
})

// GitHub PR reviewer schema
const GitHubReviewerResponse = Schema.Struct({
	id: Schema.Number,
	login: Schema.String,
	avatarUrl: Schema.String,
})

// GitHub PR branch info schema
const GitHubBranchResponse = Schema.Struct({
	ref: Schema.String,
	label: Schema.String,
})

// Full GitHub PR response
export class GitHubPRResourceResponse extends Schema.Class<GitHubPRResourceResponse>(
	"GitHubPRResourceResponse",
)({
	id: Schema.Number,
	number: Schema.Number,
	title: Schema.String,
	body: Schema.NullOr(Schema.String),
	url: Schema.String,
	state: Schema.String, // "open" | "closed"
	merged: Schema.Boolean,
	draft: Schema.Boolean,
	author: Schema.NullOr(GitHubUserResponse),
	labels: Schema.Array(GitHubLabelResponse),
	reviewers: Schema.Array(GitHubReviewerResponse),
	head: GitHubBranchResponse,
	base: GitHubBranchResponse,
	additions: Schema.Number,
	deletions: Schema.Number,
	changedFiles: Schema.Number,
	createdAt: Schema.String,
	updatedAt: Schema.String,
}) {}

// Error when organization doesn't have the integration connected
export class IntegrationNotConnectedForPreviewError extends Schema.TaggedError<IntegrationNotConnectedForPreviewError>()(
	"IntegrationNotConnectedForPreviewError",
	{
		provider: IntegrationProvider,
	},
) {}

// Error when resource cannot be found
export class ResourceNotFoundError extends Schema.TaggedError<ResourceNotFoundError>()(
	"ResourceNotFoundError",
	{
		url: Schema.String,
		message: Schema.optional(Schema.String),
	},
) {}

// API Group for integration resources
export class IntegrationResourceGroup extends HttpApiGroup.make("integration-resources")
	.add(
		HttpApiEndpoint.get("fetchLinearIssue", `/linear/issue`)
			.addSuccess(LinearIssueResourceResponse)
			.addError(IntegrationNotConnectedForPreviewError)
			.addError(ResourceNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setUrlParams(
				Schema.Struct({
					url: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Fetch Linear Issue",
					description: "Fetch Linear issue details for embedding in chat messages",
					summary: "Get Linear issue preview data",
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("fetchGitHubPR", `/github/pr`)
			.addSuccess(GitHubPRResourceResponse)
			.addError(IntegrationNotConnectedForPreviewError)
			.addError(ResourceNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setUrlParams(
				Schema.Struct({
					url: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Fetch GitHub PR",
					description: "Fetch GitHub pull request details for embedding in chat messages",
					summary: "Get GitHub PR preview data",
				}),
			),
	)
	.prefix("/integrations/resources")
	.middleware(CurrentUser.Authorization) {}
