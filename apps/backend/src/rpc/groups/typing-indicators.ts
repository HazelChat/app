import { Rpc, RpcGroup } from "@effect/rpc"
import { TypingIndicator } from "@hazel/db/models"
import { TypingIndicatorId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

/**
 * Response schema for successful typing indicator operations.
 * Contains the typing indicator data and a transaction ID for optimistic updates.
 */
export class TypingIndicatorResponse extends Schema.Class<TypingIndicatorResponse>("TypingIndicatorResponse")(
	{
		data: TypingIndicator.Model.json,
		transactionId: TransactionId,
	},
) {}

/**
 * Error thrown when a typing indicator is not found.
 * Used in update and delete operations.
 */
export class TypingIndicatorNotFoundError extends Schema.TaggedError<TypingIndicatorNotFoundError>()(
	"TypingIndicatorNotFoundError",
	{
		typingIndicatorId: TypingIndicatorId,
	},
) {}

/**
 * Payload for creating/upserting typing indicator.
 * Upserts based on channelId and memberId combination.
 */
export class CreateTypingIndicatorPayload extends Schema.Class<CreateTypingIndicatorPayload>(
	"CreateTypingIndicatorPayload",
)({
	channelId: Schema.UUID.pipe(Schema.brand("@HazelChat/ChannelId")),
	memberId: Schema.UUID.pipe(Schema.brand("@HazelChat/ChannelMemberId")),
	lastTyped: Schema.optional(Schema.Number),
}) {}

/**
 * Typing Indicator RPC Group
 *
 * Defines all RPC methods for typing indicator operations:
 * - TypingIndicatorCreate: Create or update a typing indicator (upsert)
 * - TypingIndicatorUpdate: Update an existing typing indicator timestamp
 * - TypingIndicatorDelete: Remove a typing indicator when user stops typing
 *
 * All methods require authentication via AuthMiddleware.
 *
 * Example usage from frontend:
 * ```typescript
 * const client = yield* RpcClient
 *
 * // Start typing
 * const result = yield* client.TypingIndicatorCreate({
 *   channelId: "...",
 *   memberId: "...",
 *   lastTyped: Date.now()
 * })
 *
 * // Update typing timestamp
 * yield* client.TypingIndicatorUpdate({
 *   id: "...",
 *   lastTyped: Date.now()
 * })
 *
 * // Stop typing
 * yield* client.TypingIndicatorDelete({ id: "..." })
 * ```
 */
export class TypingIndicatorRpcs extends RpcGroup.make(
	/**
	 * TypingIndicatorCreate
	 *
	 * Creates or updates a typing indicator (upsert operation).
	 * If a typing indicator already exists for the channelId/memberId combination,
	 * it will be updated. Otherwise, a new one is created.
	 *
	 * @param payload - Typing indicator data (channelId, memberId, lastTyped)
	 * @returns Typing indicator data and transaction ID
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("typingIndicator.create", {
		payload: CreateTypingIndicatorPayload,
		success: TypingIndicatorResponse,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * TypingIndicatorUpdate
	 *
	 * Updates an existing typing indicator's timestamp.
	 * Only the typing indicator owner or users with appropriate permissions can update.
	 *
	 * @param payload - Typing indicator ID and optional lastTyped timestamp
	 * @returns Updated typing indicator data and transaction ID
	 * @throws TypingIndicatorNotFoundError if typing indicator doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("typingIndicator.update", {
		payload: Schema.Struct({
			id: TypingIndicatorId,
			lastTyped: Schema.optional(Schema.Number),
		}),
		success: TypingIndicatorResponse,
		error: Schema.Union(TypingIndicatorNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * TypingIndicatorDelete
	 *
	 * Deletes a typing indicator (hard delete).
	 * Called when a user stops typing in a channel.
	 *
	 * @param payload - Typing indicator ID to delete
	 * @returns Typing indicator data and transaction ID
	 * @throws TypingIndicatorNotFoundError if typing indicator doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("typingIndicator.delete", {
		payload: Schema.Struct({ id: TypingIndicatorId }),
		success: TypingIndicatorResponse,
		error: Schema.Union(TypingIndicatorNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
