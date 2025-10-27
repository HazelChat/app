import { Rpc, RpcGroup } from "@effect/rpc"
import { MessageReaction } from "@hazel/db/models"
import { MessageReactionId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"
import { MessageNotFoundError } from "./messages"

/**
 * Response schema for successful message reaction operations.
 * Contains the message reaction data and a transaction ID for optimistic updates.
 */
export class MessageReactionResponse extends Schema.Class<MessageReactionResponse>("MessageReactionResponse")(
	{
		data: MessageReaction.Model.json,
		transactionId: TransactionId,
	},
) {}

/**
 * Error thrown when a message reaction is not found.
 * Used in update and delete operations.
 */
export class MessageReactionNotFoundError extends Schema.TaggedError<MessageReactionNotFoundError>()(
	"MessageReactionNotFoundError",
	{
		messageReactionId: MessageReactionId,
	},
) {}

export class MessageReactionRpcs extends RpcGroup.make(
	/**
	 * MessageReactionCreate
	 *
	 * Creates a new reaction on a message.
	 * The userId is automatically set from the authenticated user (CurrentUser).
	 *
	 * @param payload - Message reaction data (messageId, emoji)
	 * @returns Message reaction data and transaction ID
	 * @throws MessageNotFoundError if message doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("messageReaction.create", {
		payload: MessageReaction.Insert,
		success: MessageReactionResponse,
		error: Schema.Union(MessageNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * MessageReactionUpdate
	 *
	 * Updates an existing message reaction.
	 * Only the reaction creator or users with appropriate permissions can update.
	 *
	 * @param payload - Message reaction ID and fields to update
	 * @returns Updated message reaction data and transaction ID
	 * @throws MessageReactionNotFoundError if reaction doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("messageReaction.update", {
		payload: Schema.Struct({
			id: MessageReactionId,
			...MessageReaction.Model.jsonUpdate.fields,
		}),
		success: MessageReactionResponse,
		error: Schema.Union(MessageReactionNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * MessageReactionDelete
	 *
	 * Deletes a message reaction.
	 * Only the reaction creator or users with appropriate permissions can delete.
	 *
	 * @param payload - Message reaction ID to delete
	 * @returns Transaction ID
	 * @throws MessageReactionNotFoundError if reaction doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("messageReaction.delete", {
		payload: Schema.Struct({ id: MessageReactionId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(MessageReactionNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
