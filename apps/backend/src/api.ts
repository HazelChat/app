import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import {
	AttachmentGroup,
	ChannelGroup,
	ChannelMemberGroup,
	DirectMessageParticipantGroup,
	InvitationGroup,
	MessageGroup,
	MessageReactionGroup,
	NotificationGroup,
	OrganizationGroup,
	OrganizationMemberGroup,
	PinnedMessageGroup,
	TypingIndicatorGroup,
	UserGroup,
} from "./api/electric/collections"
import { TransactionId } from "./lib/schema"

export class RootGroup extends HttpApiGroup.make("root").add(
	HttpApiEndpoint.get("root")`/`.addSuccess(Schema.String),
) {}

// WorkOS Webhook Types
export class WorkOSWebhookPayload extends Schema.Class<WorkOSWebhookPayload>("WorkOSWebhookPayload")({
	event: Schema.String,
	data: Schema.Unknown,
	id: Schema.String,
	created_at: Schema.String,
}) {}

export class WebhookResponse extends Schema.Class<WebhookResponse>("WebhookResponse")({
	success: Schema.Boolean,
	message: Schema.optional(Schema.String),
}) {}

export class InvalidWebhookSignature extends Schema.TaggedError<InvalidWebhookSignature>(
	"InvalidWebhookSignature",
)(
	"InvalidWebhookSignature",
	{
		message: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 401,
	}),
) {}

export class WebhookGroup extends HttpApiGroup.make("webhooks")
	.add(
		HttpApiEndpoint.post("workos")`/workos`
			.setPayload(Schema.Unknown) // Raw payload for signature verification
			.addSuccess(WebhookResponse)
			.addError(InvalidWebhookSignature)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "WorkOS Webhook",
					description: "Receive and process WorkOS webhook events",
					summary: "Process WorkOS webhook events",
				}),
			),
	)
	.prefix("/webhooks") {}

export class GenerateMockDataRequest extends Schema.Class<GenerateMockDataRequest>("GenerateMockDataRequest")(
	{
		organizationId: Schema.UUID,
		userCount: Schema.Number,
		channelCount: Schema.Number,
		messageCount: Schema.Number,
	},
) {}

export class GenerateMockDataResponse extends Schema.Class<GenerateMockDataResponse>(
	"GenerateMockDataResponse",
)({
	transactionId: TransactionId,
	created: Schema.Struct({
		users: Schema.Number,
		channels: Schema.Number,
		messages: Schema.Number,
		organizationMembers: Schema.Number,
	}),
}) {}

export class MockDataGroup extends HttpApiGroup.make("mockData")
	.add(
		HttpApiEndpoint.post("generate")`/generate`
			.setPayload(GenerateMockDataRequest)
			.addSuccess(GenerateMockDataResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Generate Mock Data",
					description: "Generate mock data for an organization",
					summary: "Generate test data",
				}),
			),
	)
	.prefix("/mock-data")
	.middleware(CurrentUser.Authorization) {}

export class AuthCallbackRequest extends Schema.Class<AuthCallbackRequest>("AuthCallbackRequest")({
	code: Schema.String,
	state: Schema.optional(Schema.String),
}) {}

export class LoginResponse extends Schema.Class<LoginResponse>("LoginResponse")({
	authorizationUrl: Schema.String,
}) {}

export class AuthGroup extends HttpApiGroup.make("auth")
	.add(
		HttpApiEndpoint.get("login")`/login`
			.addSuccess(LoginResponse)
			.addError(InternalServerError)
			.setUrlParams(
				Schema.Struct({
					returnTo: Schema.String,
					workosOrganizationId: Schema.optional(Schema.String),
					invitationToken: Schema.optional(Schema.String),
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "Login",
					description: "Get WorkOS authorization URL for authentication",
					summary: "Initiate login flow",
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("callback")`/callback`
			.addSuccess(Schema.Void, { status: 302 })
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setUrlParams(
				Schema.Struct({
					code: Schema.String,
					state: Schema.String,
				}),
			)
			.annotateContext(
				OpenApi.annotations({
					title: "OAuth Callback",
					description: "Handle OAuth callback from WorkOS and set session cookie",
					summary: "Process OAuth callback",
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("logout")`/logout`
			.addSuccess(Schema.Void)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Logout",
					description: "Clear session and logout user",
					summary: "End user session",
				}),
			),
	)
	.prefix("/auth") {}

export class HazelApi extends HttpApi.make("HazelApp")
	.add(ChannelGroup)
	.add(ChannelMemberGroup)
	.add(MessageGroup)
	.add(OrganizationGroup)
	.add(InvitationGroup)
	.add(MessageReactionGroup)
	.add(PinnedMessageGroup)
	.add(NotificationGroup)
	.add(UserGroup)
	.add(OrganizationMemberGroup)
	.add(AttachmentGroup)
	.add(DirectMessageParticipantGroup)
	.add(TypingIndicatorGroup)
	.add(RootGroup)
	.add(AuthGroup)
	.add(WebhookGroup)
	.add(MockDataGroup)
	.annotateContext(
		OpenApi.annotations({
			title: "Hazel Chat API",
			description: "API for the Hazel chat application",
			version: "1.0.0",
		}),
	) {}

export * from "./api/electric/collections"
