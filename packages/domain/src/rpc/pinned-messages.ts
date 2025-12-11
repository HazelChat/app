import { RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { Rpc } from "effect-rpc-tanstack-devtools"
import { InternalServerError, UnauthorizedError } from "../errors"
import { ChannelId, MessageId, PinnedMessageId } from "../ids"
import { PinnedMessage } from "../models"
import { TransactionId } from "../transaction-id"
import { MessageNotFoundError } from "./messages"
import { AuthMiddleware } from "./middleware"

/**
 * Response schema for successful pinned message operations.
 * Contains the pinned message data and a transaction ID for optimistic updates.
 */
export class PinnedMessageResponse extends Schema.Class<PinnedMessageResponse>("PinnedMessageResponse")({
	data: PinnedMessage.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a pinned message is not found.
 * Used in update and delete operations.
 */
export class PinnedMessageNotFoundError extends Schema.TaggedError<PinnedMessageNotFoundError>()(
	"PinnedMessageNotFoundError",
	{
		pinnedMessageId: PinnedMessageId,
	},
) {}

/**
 * Pinned Message RPC Group
 *
 * Defines all RPC methods for pinned message operations:
 * - PinnedMessageCreate: Pin a message in a channel
 * - PinnedMessageUpdate: Update a pinned message
 * - PinnedMessageDelete: Unpin a message from a channel
 *
 * All methods require authentication via AuthMiddleware.
 *
 * Example usage from frontend:
 * ```typescript
 * const client = yield* RpcClient
 *
 * // Pin a message
 * const result = yield* client.PinnedMessageCreate({
 *   channelId: "...",
 *   messageId: "..."
 * })
 *
 * // Update pinned message
 * yield* client.PinnedMessageUpdate({
 *   id: "...",
 *   // update fields
 * })
 *
 * // Unpin message
 * yield* client.PinnedMessageDelete({ id: "..." })
 * ```
 */
export class PinnedMessageRpcs extends RpcGroup.make(
	/**
	 * PinnedMessageCreate
	 *
	 * Pins a message in a channel.
	 * The pinnedBy field is automatically set from the authenticated user (CurrentUser).
	 *
	 * @param payload - channelId and messageId
	 * @returns Pinned message data and transaction ID
	 * @throws MessageNotFoundError if the message doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.mutation("pinnedMessage.create", {
		payload: Schema.Struct({
			channelId: ChannelId,
			messageId: MessageId,
		}),
		success: PinnedMessageResponse,
		error: Schema.Union(MessageNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * PinnedMessageUpdate
	 *
	 * Updates an existing pinned message.
	 * Only users with appropriate permissions can update.
	 *
	 * @param payload - Pinned message ID and fields to update
	 * @returns Updated pinned message data and transaction ID
	 * @throws PinnedMessageNotFoundError if pinned message doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.mutation("pinnedMessage.update", {
		payload: Schema.Struct({
			id: PinnedMessageId,
			...PinnedMessage.Model.jsonUpdate.fields,
		}),
		success: PinnedMessageResponse,
		error: Schema.Union(PinnedMessageNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * PinnedMessageDelete
	 *
	 * Unpins a message from a channel (hard delete).
	 * Only users with appropriate permissions can unpin messages.
	 *
	 * @param payload - Pinned message ID to delete
	 * @returns Transaction ID
	 * @throws PinnedMessageNotFoundError if pinned message doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.mutation("pinnedMessage.delete", {
		payload: Schema.Struct({ id: PinnedMessageId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(PinnedMessageNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
