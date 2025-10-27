import { Rpc, RpcGroup } from "@effect/rpc"
import { DirectMessageParticipant } from "@hazel/db/models"
import { DirectMessageParticipantId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"
import { ChannelNotFoundError } from "./channels"

/**
 * Response schema for successful direct message participant operations.
 * Contains the participant data and a transaction ID for optimistic updates.
 */
export class DirectMessageParticipantResponse extends Schema.Class<DirectMessageParticipantResponse>(
	"DirectMessageParticipantResponse",
)({
	data: DirectMessageParticipant.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a direct message participant is not found.
 * Used in update and delete operations.
 */
export class DirectMessageParticipantNotFoundError extends Schema.TaggedError<DirectMessageParticipantNotFoundError>()(
	"DirectMessageParticipantNotFoundError",
	{
		participantId: DirectMessageParticipantId,
	},
) {}

/**
 * DirectMessageParticipant RPC Group
 *
 * Defines all RPC methods for direct message participant operations:
 * - DirectMessageParticipantCreate: Add a participant to a DM channel
 * - DirectMessageParticipantUpdate: Update a participant
 * - DirectMessageParticipantDelete: Remove a participant from a DM channel
 *
 * All methods require authentication via AuthMiddleware.
 *
 * Example usage from frontend:
 * ```typescript
 * const client = yield* RpcClient
 *
 * // Create participant
 * const result = yield* client.DirectMessageParticipantCreate({
 *   channelId: "...",
 *   userId: "...",
 *   organizationId: "..."
 * })
 *
 * // Update participant
 * yield* client.DirectMessageParticipantUpdate({
 *   id: "...",
 *   ...fields
 * })
 *
 * // Delete participant
 * yield* client.DirectMessageParticipantDelete({ id: "..." })
 * ```
 */
export class DirectMessageParticipantRpcs extends RpcGroup.make(
	/**
	 * DirectMessageParticipantCreate
	 *
	 * Adds a new participant to a direct message channel.
	 *
	 * @param payload - Participant data (channelId, userId, organizationId)
	 * @returns Participant data and transaction ID
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("directMessageParticipant.create", {
		payload: DirectMessageParticipant.Insert,
		success: DirectMessageParticipantResponse,
		error: Schema.Union(ChannelNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * DirectMessageParticipantUpdate
	 *
	 * Updates an existing direct message participant.
	 * Only users with appropriate permissions can update.
	 *
	 * @param payload - Participant ID and fields to update
	 * @returns Updated participant data and transaction ID
	 * @throws DirectMessageParticipantNotFoundError if participant doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("directMessageParticipant.update", {
		payload: Schema.Struct({
			id: DirectMessageParticipantId,
			...DirectMessageParticipant.Model.jsonUpdate.fields,
		}),
		success: DirectMessageParticipantResponse,
		error: Schema.Union(
			DirectMessageParticipantNotFoundError,
			UnauthorizedError,
			InternalServerError,
		),
	}).middleware(AuthMiddleware),

	/**
	 * DirectMessageParticipantDelete
	 *
	 * Removes a participant from a direct message channel.
	 * Only users with appropriate permissions can delete.
	 *
	 * @param payload - Participant ID to delete
	 * @returns Transaction ID
	 * @throws DirectMessageParticipantNotFoundError if participant doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("directMessageParticipant.delete", {
		payload: Schema.Struct({ id: DirectMessageParticipantId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(
			DirectMessageParticipantNotFoundError,
			UnauthorizedError,
			InternalServerError,
		),
	}).middleware(AuthMiddleware),
) {}
