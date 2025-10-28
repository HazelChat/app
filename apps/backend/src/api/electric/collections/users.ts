import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"

export class UserGroup extends HttpApiGroup.make("users")
	.add(
		HttpApiEndpoint.get("me", `/me`)
			.addSuccess(CurrentUser.Schema)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Get Current User",
					description: "Get the currently authenticated user",
					summary: "Get current user profile",
				}),
			),
	)
	.prefix("/users")
	.middleware(CurrentUser.Authorization) {}
