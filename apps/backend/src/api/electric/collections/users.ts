import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { User } from "@hazel/db/models"
import { UserId } from "@hazel/db/schema"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../../lib/schema"

export class UserResponse extends Schema.Class<UserResponse>("UserResponse")({
	data: User.Model.json,
	transactionId: TransactionId,
}) {}

export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>("UserNotFoundError")(
	"UserNotFoundError",
	{
		userId: Schema.UUID,
	},
	{
		status: 404,
	},
) {}

export class UserGroup extends HttpApiGroup.make("users")
	.add(
		HttpApiEndpoint.get("me", `/me`)
			.addSuccess(User.Model.json)
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
	.add(
		HttpApiEndpoint.post("create", `/`)
			.setPayload(User.Model.jsonCreate)
			.addSuccess(UserResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Create User",
					description: "Create a new user",
					summary: "Create a user",
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("update", `/:id`)
			.setPath(Schema.Struct({ id: UserId }))
			.setPayload(User.Model.jsonUpdate)
			.addSuccess(UserResponse)
			.addError(UserNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Update User",
					description: "Update an existing user",
					summary: "Update a user",
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("delete", "/:id")
			.setPath(Schema.Struct({ id: UserId }))
			.addSuccess(Schema.Struct({ transactionId: TransactionId }))
			.addError(UserNotFoundError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Delete User",
					description: "Delete an existing user",
					summary: "Delete a user",
				}),
			),
	)
	.prefix("/users")
	.middleware(CurrentUser.Authorization) {}
