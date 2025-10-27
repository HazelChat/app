import { Rpc, RpcGroup } from "@effect/rpc"
import { Attachment } from "@hazel/db/models"
import { AttachmentId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

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
	Rpc.make("attachment.delete", {
		payload: Schema.Struct({ id: AttachmentId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(AttachmentNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
