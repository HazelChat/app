import { Rpc, RpcGroup } from "@effect/rpc"
import { UserPresenceStatus } from "@hazel/db/models"
import { UserPresenceStatusId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

/**
 * Response schema for successful user presence status operations.
 * Contains the status data and a transaction ID for optimistic updates.
 */
export class UserPresenceStatusResponse extends Schema.Class<UserPresenceStatusResponse>(
	"UserPresenceStatusResponse",
)({
	data: UserPresenceStatus.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a user presence status is not found.
 * Used in update operations.
 */
export class UserPresenceStatusNotFoundError extends Schema.TaggedError<UserPresenceStatusNotFoundError>()(
	"UserPresenceStatusNotFoundError",
	{
		statusId: UserPresenceStatusId,
	},
) {}

/**
 * UserPresenceStatus RPC Group
 *
 * Defines RPC methods for user presence status operations:
 * - UserPresenceStatusUpdate: Update user's presence status and custom message
 *
 * All methods require authentication via AuthMiddleware.
 *
 * Example usage from frontend:
 * ```typescript
 * const client = yield* RpcClient
 *
 * // Update presence status
 * const result = yield* client.UserPresenceStatusUpdate({
 *   status: "online",
 *   customMessage: "Working on something cool"
 * })
 * ```
 */
export class UserPresenceStatusRpcs extends RpcGroup.make(
	/**
	 * UserPresenceStatusUpdate
	 *
	 * Updates the user's presence status and optional custom message.
	 * The userId is automatically set from the authenticated user (CurrentUser).
	 *
	 * @param payload - Status and optional custom message
	 * @returns Updated status data and transaction ID
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("userPresenceStatus.update", {
		payload: Schema.Struct({
			status: Schema.optional(UserPresenceStatus.Model.json.fields.status),
			customMessage: Schema.optional(Schema.NullOr(Schema.String)),
			activeChannelId: Schema.optional(Schema.NullOr(UserPresenceStatus.Model.json.fields.activeChannelId)),
		}),
		success: UserPresenceStatusResponse,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
