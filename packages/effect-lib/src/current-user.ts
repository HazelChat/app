import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform"
import { Context as C, Schema as S } from "effect"
import { UnauthorizedError } from "./errors"
import { UserId } from "./schema"

export class Schema extends S.Class<Schema>("CurrentUserSchema")({
	id: UserId,
	workosOrganizationId: S.optional(S.String),
	role: S.Literal("admin", "member"),
	avatarUrl: S.optional(S.String),
	firstName: S.optional(S.String),
	lastName: S.optional(S.String),
	email: S.String,
}) {}

export class Context extends C.Tag("CurrentUser")<Context, Schema>() {}

export const Cookie = HttpApiSecurity.apiKey({
	in: "cookie",
	key: "workos-session",
})

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
	failure: UnauthorizedError,
	provides: Context,
	security: {
		cookie: Cookie,
		bearer: HttpApiSecurity.bearer,
	},
}) {}
