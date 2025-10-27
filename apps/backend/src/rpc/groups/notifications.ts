import { Rpc, RpcGroup } from "@effect/rpc"
import { Notification } from "@hazel/db/models"
import { NotificationId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

/**
 * Response schema for successful notification operations.
 * Contains the notification data and a transaction ID for optimistic updates.
 */
export class NotificationResponse extends Schema.Class<NotificationResponse>("NotificationResponse")({
	data: Notification.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a notification is not found.
 * Used in update and delete operations.
 */
export class NotificationNotFoundError extends Schema.TaggedError<NotificationNotFoundError>()(
	"NotificationNotFoundError",
	{
		notificationId: NotificationId,
	},
) {}

export class NotificationRpcs extends RpcGroup.make(
	/**
	 * NotificationCreate
	 *
	 * Creates a new notification for a member.
	 * Notifications can be used for mentions, reactions, system alerts, etc.
	 *
	 * @param payload - Notification data (memberId, type, content, etc.)
	 * @returns Notification data and transaction ID
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("notification.create", {
		payload: Notification.Model.jsonCreate,
		success: NotificationResponse,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * NotificationUpdate
	 *
	 * Updates an existing notification.
	 * Typically used to mark notifications as read.
	 *
	 * @param payload - Notification ID and fields to update
	 * @returns Updated notification data and transaction ID
	 * @throws NotificationNotFoundError if notification doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("notification.update", {
		payload: Schema.Struct({
			id: NotificationId,
			...Notification.Model.jsonUpdate.fields,
		}),
		success: NotificationResponse,
		error: Schema.Union(NotificationNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * NotificationDelete
	 *
	 * Deletes a notification.
	 * Only the notification owner or users with appropriate permissions can delete.
	 *
	 * @param payload - Notification ID to delete
	 * @returns Transaction ID
	 * @throws NotificationNotFoundError if notification doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("notification.delete", {
		payload: Schema.Struct({ id: NotificationId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(NotificationNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
