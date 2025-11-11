import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { InternalServerError, UnauthorizedError } from "../errors"
import { OrganizationId } from "../ids"

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
					organizationId: Schema.optional(OrganizationId),
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
