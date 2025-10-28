import { Rpc, RpcGroup } from "@effect/rpc"
import { User } from "@hazel/db/models"
import { UserId } from "@hazel/db/schema"
import { CurrentUser, InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

/**
 * Response schema for successful user operations.
 * Contains the user data and a transaction ID for optimistic updates.
 */
export class UserResponse extends Schema.Class<UserResponse>("UserResponse")({
	data: User.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a user is not found.
 * Used in update and delete operations.
 */
export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()("UserNotFoundError", {
	userId: UserId,
}) {}

export class UserRpcs extends RpcGroup.make(
	/**
	 * UserMe
	 *
	 * Get the currently authenticated user.
	 *
	 * @returns Current user data
	 * @throws UnauthorizedError if user is not authenticated
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("user.me", {
		payload: Schema.Void,
		success: CurrentUser.Schema,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * UserCreate
	 *
	 * Creates a new user.
	 * User data is validated according to the User.Insert schema.
	 *
	 * @param payload - User data (email, firstName, lastName, etc.)
	 * @returns User data and transaction ID
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("user.create", {
		payload: User.Insert,
		success: UserResponse,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * UserUpdate
	 *
	 * Updates an existing user.
	 * Only users with appropriate permissions can update user data.
	 *
	 * @param payload - User ID and fields to update
	 * @returns Updated user data and transaction ID
	 * @throws UserNotFoundError if user doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("user.update", {
		payload: Schema.Struct({
			id: UserId,
			...User.Model.jsonUpdate.fields,
		}),
		success: UserResponse,
		error: Schema.Union(UserNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * UserDelete
	 *
	 * Deletes a user (soft delete).
	 * Only users with appropriate permissions can delete users.
	 *
	 * @param payload - User ID to delete
	 * @returns Transaction ID
	 * @throws UserNotFoundError if user doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("user.delete", {
		payload: Schema.Struct({ id: UserId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(UserNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
