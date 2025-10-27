import { Rpc, RpcGroup } from "@effect/rpc"
import { Invitation } from "@hazel/db/models"
import { InvitationId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

/**
 * Response schema for successful invitation operations.
 * Contains the invitation data and a transaction ID for optimistic updates.
 */
export class InvitationResponse extends Schema.Class<InvitationResponse>("InvitationResponse")({
	data: Invitation.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when an invitation is not found.
 * Used in update and delete operations.
 */
export class InvitationNotFoundError extends Schema.TaggedError<InvitationNotFoundError>()(
	"InvitationNotFoundError",
	{
		invitationId: InvitationId,
	},
) {}

export class InvitationRpcs extends RpcGroup.make(
	/**
	 * InvitationCreate
	 *
	 * Creates a new invitation to an organization.
	 * The inviter must have permission to invite users to the organization.
	 *
	 * @param payload - Invitation data (organizationId, email, role, etc.)
	 * @returns Invitation data and transaction ID
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("invitation.create", {
		payload: Invitation.Model.jsonCreate,
		success: InvitationResponse,
		error: Schema.Union(UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * InvitationUpdate
	 *
	 * Updates an existing invitation.
	 * Can be used to change invitation status, role, or other properties.
	 *
	 * @param payload - Invitation ID and fields to update
	 * @returns Updated invitation data and transaction ID
	 * @throws InvitationNotFoundError if invitation doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("invitation.update", {
		payload: Schema.Struct({
			id: InvitationId,
			...Invitation.Model.jsonUpdate.fields,
		}),
		success: InvitationResponse,
		error: Schema.Union(InvitationNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * InvitationDelete
	 *
	 * Deletes an invitation.
	 * Only the invitation creator or users with appropriate permissions can delete.
	 *
	 * @param payload - Invitation ID to delete
	 * @returns Transaction ID
	 * @throws InvitationNotFoundError if invitation doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("invitation.delete", {
		payload: Schema.Struct({ id: InvitationId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(InvitationNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
