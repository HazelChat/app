import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema } from "effect"
import { DmChannelAlreadyExistsError, InternalServerError, UnauthorizedError } from "../errors"
import { ChannelId, OrganizationId, UserId } from "../ids"
import { Channel } from "../models"
import { TransactionId } from "../transaction-id"
import { AuthMiddleware } from "./middleware"

/**
 * Response schema for successful channel operations.
 * Contains the channel data and a transaction ID for optimistic updates.
 */
export class ChannelResponse extends Schema.Class<ChannelResponse>("ChannelResponse")({
	data: Channel.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when a channel is not found.
 * Used in update and delete operations.
 */
export class ChannelNotFoundError extends Schema.TaggedError<ChannelNotFoundError>()("ChannelNotFoundError", {
	channelId: ChannelId,
}) {}

/**
 * Hazel Connect: Error thrown when trying to share a channel that is already shared with the organization.
 */
export class ChannelAlreadySharedError extends Schema.TaggedError<ChannelAlreadySharedError>()(
	"ChannelAlreadySharedError",
	{
		channelId: ChannelId,
		organizationId: OrganizationId,
	},
) {}

/**
 * Hazel Connect: Error thrown when trying to share a channel with the same organization that owns it.
 */
export class CannotShareWithOwnerOrgError extends Schema.TaggedError<CannotShareWithOwnerOrgError>()(
	"CannotShareWithOwnerOrgError",
	{
		channelId: ChannelId,
		organizationId: OrganizationId,
	},
) {}

/**
 * Request schema for creating DM or group channels.
 * Specifies participants and channel type.
 */
export class CreateDmChannelRequest extends Schema.Class<CreateDmChannelRequest>("CreateDmChannelRequest")({
	participantIds: Schema.Array(UserId),
	type: Schema.Literal("direct", "single"),
	name: Schema.optional(Schema.String),
	organizationId: Schema.UUID,
}) {}

export class ChannelRpcs extends RpcGroup.make(
	/**
	 * ChannelCreate
	 *
	 * Creates a new channel in an organization.
	 * The current user is automatically added as a member of the channel.
	 * Requires permission to create channels in the organization.
	 *
	 * @param payload - Channel data (name, type, organizationId, etc.)
	 * @returns Channel data and transaction ID
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.create", {
		payload: Channel.Model.jsonCreate,
		success: ChannelResponse,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * ChannelUpdate
	 *
	 * Updates an existing channel.
	 * Only users with appropriate permissions can update a channel.
	 *
	 * @param payload - Channel ID and fields to update
	 * @returns Updated channel data and transaction ID
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.update", {
		payload: Schema.Struct({
			id: ChannelId,
			...Channel.Model.jsonUpdate.fields,
		}),
		success: ChannelResponse,
		error: Schema.Union(ChannelNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * ChannelDelete
	 *
	 * Deletes a channel (soft delete).
	 * Only users with appropriate permissions can delete a channel.
	 *
	 * @param payload - Channel ID to delete
	 * @returns Transaction ID
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.delete", {
		payload: Schema.Struct({ id: ChannelId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(ChannelNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * ChannelCreateDm
	 *
	 * Creates a direct message or group channel with specified participants.
	 * For single DMs, automatically checks if a DM already exists between users.
	 * All participants are automatically added as channel members.
	 *
	 * @param payload - Participant IDs, channel type, and organization ID
	 * @returns Channel data and transaction ID
	 * @throws DmChannelAlreadyExistsError if DM already exists (for single type)
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.createDm", {
		payload: CreateDmChannelRequest,
		success: ChannelResponse,
		error: Schema.Union(DmChannelAlreadyExistsError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * Hazel Connect: ChannelShare
	 *
	 * Share a channel with another organization.
	 * Only admins/owners of the channel's initiator organization can share.
	 * Creates a pending share that notifies target org admins.
	 *
	 * @param payload - Channel ID and target organization ID
	 * @returns Transaction ID
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws ChannelAlreadySharedError if already shared with this org
	 * @throws CannotShareWithOwnerOrgError if trying to share with owner org
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.share", {
		payload: Schema.Struct({
			channelId: ChannelId,
			organizationId: OrganizationId,
		}),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(
			ChannelNotFoundError,
			ChannelAlreadySharedError,
			CannotShareWithOwnerOrgError,
			UnauthorizedError,
			InternalServerError,
		),
	}).middleware(AuthMiddleware),

	/**
	 * Hazel Connect: ChannelRevokeShare
	 *
	 * Revoke an organization's access to a shared channel.
	 * Only admins/owners of the channel's initiator organization can revoke.
	 *
	 * @param payload - Channel ID and organization ID to revoke access from
	 * @returns Transaction ID
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.revokeShare", {
		payload: Schema.Struct({
			channelId: ChannelId,
			organizationId: OrganizationId,
		}),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(ChannelNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * Hazel Connect: ChannelGetShares
	 *
	 * Get all organizations that have access to a channel.
	 * Returns the owner organization and all guest organizations.
	 *
	 * @param payload - Channel ID
	 * @returns Array of organization IDs
	 * @throws ChannelNotFoundError if channel doesn't exist
	 * @throws UnauthorizedError if user lacks permission to view
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("channel.getShares", {
		payload: Schema.Struct({ channelId: ChannelId }),
		success: Schema.Struct({ organizationIds: Schema.Array(OrganizationId) }),
		error: Schema.Union(ChannelNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
