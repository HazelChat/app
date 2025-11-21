import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform"
import { Context as C, Schema as S } from "effect"
import { UnauthorizedError } from "./errors"
import { OrganizationId, UserId } from "./ids"
import {
	InvalidBearerTokenError,
	InvalidJwtPayloadError,
	SessionAuthenticationError,
	SessionExpiredError,
	SessionLoadError,
	SessionNotProvidedError,
	SessionRefreshError,
	WorkOSUserFetchError,
} from "./session-errors"

export class Schema extends S.Class<Schema>("CurrentUserSchema")({
	id: UserId,
	organizationId: S.optional(OrganizationId),
	role: S.Literal("admin", "member", "owner"),
	avatarUrl: S.optional(S.String),
	firstName: S.optional(S.String),
	lastName: S.optional(S.String),
	email: S.String,
	isOnboarded: S.Boolean,
}) {}

export class Context extends C.Tag("CurrentUser")<Context, Schema>() {}

export const Cookie = HttpApiSecurity.apiKey({
	in: "cookie",
	key: "workos-session",
})

const AuthFailure = S.Union(
	UnauthorizedError,
	SessionLoadError,
	SessionAuthenticationError,
	InvalidJwtPayloadError,
	SessionNotProvidedError,
	SessionRefreshError,
	SessionExpiredError,
	InvalidBearerTokenError,
	WorkOSUserFetchError,
)

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
	failure: AuthFailure,
	provides: Context,
	security: {
		cookie: Cookie,
		bearer: HttpApiSecurity.bearer,
	},
}) {}
