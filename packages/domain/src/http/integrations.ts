import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import * as CurrentUser from "../current-user"
import { InternalServerError, UnauthorizedError } from "../errors"
import { IntegrationConnection } from "../models"

// Provider type from the model
const IntegrationProvider = IntegrationConnection.IntegrationProvider

// Request/Response schemas
export class OAuthUrlResponse extends Schema.Class<OAuthUrlResponse>("OAuthUrlResponse")({
	authorizationUrl: Schema.String,
}) {}

export class ConnectionStatusResponse extends Schema.Class<ConnectionStatusResponse>(
	"ConnectionStatusResponse",
)({
	connected: Schema.Boolean,
	provider: IntegrationProvider,
	externalAccountName: Schema.NullOr(Schema.String),
	status: Schema.NullOr(IntegrationConnection.ConnectionStatus),
	connectedAt: Schema.NullOr(Schema.DateFromString),
	lastUsedAt: Schema.NullOr(Schema.DateFromString),
}) {}

// Error types
export class IntegrationNotConnectedError extends Schema.TaggedError<IntegrationNotConnectedError>()(
	"IntegrationNotConnectedError",
	{
		provider: IntegrationProvider,
	},
) {}

export class InvalidOAuthStateError extends Schema.TaggedError<InvalidOAuthStateError>()(
	"InvalidOAuthStateError",
	{
		message: Schema.String,
	},
) {}

export class UnsupportedProviderError extends Schema.TaggedError<UnsupportedProviderError>()(
	"UnsupportedProviderError",
	{
		provider: Schema.String,
	},
) {}

export class IntegrationGroup extends HttpApiGroup.make("integrations")
	// Get OAuth authorization URL
	.add(
		HttpApiEndpoint.get("getOAuthUrl", `/:provider/oauth`)
			.addSuccess(OAuthUrlResponse)
			.addError(UnsupportedProviderError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					provider: IntegrationProvider,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Get OAuth URL",
					description: "Get the OAuth authorization URL for a provider",
					summary: "Initiate OAuth flow",
				}),
			),
	)
	// OAuth callback handler
	.add(
		HttpApiEndpoint.get("oauthCallback", `/:provider/callback`)
			.addSuccess(Schema.Void, { status: 302 })
			.addError(InvalidOAuthStateError)
			.addError(UnsupportedProviderError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					provider: IntegrationProvider,
				}),
			)
			.setUrlParams(
				Schema.Struct({
					code: Schema.String,
					state: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "OAuth Callback",
					description: "Handle OAuth callback from integration provider",
					summary: "Process OAuth callback",
				}),
			),
	)
	// Get connection status
	.add(
		HttpApiEndpoint.get("getConnectionStatus")`/:provider/status`
			.addSuccess(ConnectionStatusResponse)
			.addError(UnsupportedProviderError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					provider: IntegrationProvider,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Get Connection Status",
					description: "Check the connection status for a provider",
					summary: "Get integration status",
				}),
			),
	)
	// Disconnect integration
	.add(
		HttpApiEndpoint.del("disconnect")`/:provider`
			.addSuccess(Schema.Void)
			.addError(IntegrationNotConnectedError)
			.addError(UnsupportedProviderError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					provider: IntegrationProvider,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Disconnect Integration",
					description: "Disconnect an integration and revoke tokens",
					summary: "Disconnect provider",
				}),
			),
	)
	.prefix("/integrations")
	.middleware(CurrentUser.Authorization) {}
