import { Rpc, RpcGroup } from "@effect/rpc"
import { ChannelMember } from "@hazel/db/models"
import { ChannelMemberId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"
import { ChannelNotFoundError } from "./channels"

/**
 * Response schema for successful channel member operations.
 * Contains the channel member data and a transaction ID for optimistic updates.
 */
export class ChannelMemberResponse extends Schema.Class<ChannelMemberResponse>("ChannelMemberResponse")({
	data: ChannelMember.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a channel member is not found.
 * Used in update and delete operations.
 */
export class ChannelMemberNotFoundError extends Schema.TaggedError<ChannelMemberNotFoundError>()(
	"ChannelMemberNotFoundError",
	{
		channelMemberId: ChannelMemberId,
	},
) {}

/**
 * Channel Member RPC Group
 *
 * Defines all RPC methods for channel member operations:
 * - ChannelMemberCreate: Add a user to a channel
 * - ChannelMemberUpdate: Update channel member preferences
 * - ChannelMemberDelete: Remove a user from a channel
 *
 * All methods require authentication via AuthMiddleware.
 *
 * Example usage from frontend:
 * ```typescript
 * const client = yield* RpcClient
 *
 * // Add member to channel
 * const result = yield* client.ChannelMemberCreate({
 *   channelId: "...",
 *   isHidden: false,
 *   isMuted: false,
 *   isFavorite: false,
 *   lastSeenMessageId: null
 * })
 *
 * // Update member preferences
 * yield* client.ChannelMemberUpdate({
 *   id: "...",
 *   isMuted: true,
 *   isFavorite: true
 * })
 *
 * // Remove member from channel
 * yield* client.ChannelMemberDelete({ id: "..." })
 * ```
 */
export class ChannelMemberRpcs extends RpcGroup.make(
	/**
	 * ChannelMemberCreate
	 *
	 * Adds the current user to a channel.
	 * The userId is automatically set from the authenticated user (CurrentUser).
	 * Requires permission to join the channel (e.g., public channels or organization admin).
	 *
	 * @param payload - Channel member data (channelId, preferences, etc.)
	 * @returns Channel member data and transaction ID
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channelMember.create", {
		payload: ChannelMember.Model.jsonCreate,
		success: ChannelMemberResponse,
		error: Schema.Union(ChannelNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * ChannelMemberUpdate
	 *
	 * Updates channel member preferences and settings.
	 * Members can update their own preferences (mute, hide, favorite).
	 * Organization admins can update any member's settings.
	 *
	 * @param payload - Channel member ID and fields to update
	 * @returns Updated channel member data and transaction ID
	 * @throws ChannelMemberNotFoundError if channel member doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channelMember.update", {
		payload: Schema.Struct({
			id: ChannelMemberId,
			...ChannelMember.Model.jsonUpdate.fields,
		}),
		success: ChannelMemberResponse,
		error: Schema.Union(ChannelMemberNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * ChannelMemberDelete
	 *
	 * Removes a user from a channel (soft delete).
	 * Members can leave channels themselves.
	 * Organization admins can remove any member from a channel.
	 *
	 * @param payload - Channel member ID to delete
	 * @returns Transaction ID
	 * @throws ChannelMemberNotFoundError if channel member doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channelMember.delete", {
		payload: Schema.Struct({ id: ChannelMemberId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(ChannelMemberNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
