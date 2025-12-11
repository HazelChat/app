import { RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { Rpc } from "effect-rpc-tanstack-devtools"
import { InternalServerError, UnauthorizedError } from "../errors"
import { AttachmentId } from "../ids"
import { Attachment } from "../models"
import { TransactionId } from "../transaction-id"
import { AuthMiddleware } from "./middleware"

/**
 * Error thrown when an attachment is not found.
 * Used in delete operations.
 */
export class AttachmentNotFoundError extends Schema.TaggedError<AttachmentNotFoundError>()(
	"AttachmentNotFoundError",
	{
		attachmentId: AttachmentId,
	},
) {}

/**
 * Attachment RPC Group
 *
 * Defines RPC methods for attachment operations:
 * - AttachmentDelete: Delete an attachment
 *
 * All methods require authentication via AuthMiddleware.
 *
 * Example usage from frontend:
 * ```typescript
 * const client = yield* RpcClient
 *
 * // Delete attachment
 * yield* client.AttachmentDelete({ id: "..." })
 * ```
 */
export class AttachmentRpcs extends RpcGroup.make(
	/**
	 * AttachmentDelete
	 *
	 * Deletes an attachment (soft delete).
	 * Only the uploader or users with appropriate permissions can delete.
	 *
	 * @param payload - Attachment ID to delete
	 * @returns Transaction ID
	 * @throws AttachmentNotFoundError if attachment doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.mutation("attachment.delete", {
		payload: Schema.Struct({ id: AttachmentId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(AttachmentNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * AttachmentComplete
	 *
	 * Marks an attachment as complete after direct upload to R2.
	 * Only the original uploader can mark as complete.
	 *
	 * @param payload - Attachment ID to mark complete
	 * @returns The completed attachment model
	 * @throws AttachmentNotFoundError if attachment doesn't exist
	 * @throws UnauthorizedError if user is not the uploader
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.mutation("attachment.complete", {
		payload: Schema.Struct({ id: AttachmentId }),
		success: Attachment.Model,
		error: Schema.Union(AttachmentNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * AttachmentFail
	 *
	 * Marks an attachment as failed after an upload error.
	 * Only the original uploader can mark as failed.
	 *
	 * @param payload - Attachment ID and optional failure reason
	 * @returns void
	 * @throws AttachmentNotFoundError if attachment doesn't exist
	 * @throws UnauthorizedError if user is not the uploader
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.mutation("attachment.fail", {
		payload: Schema.Struct({
			id: AttachmentId,
			reason: Schema.optional(Schema.String),
		}),
		success: Schema.Void,
		error: Schema.Union(AttachmentNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
