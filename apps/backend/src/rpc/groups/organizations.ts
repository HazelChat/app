import { Rpc, RpcGroup } from "@effect/rpc"
import { Organization } from "@hazel/db/models"
import { OrganizationId } from "@hazel/db/schema"
import { InternalServerError, UnauthorizedError } from "@hazel/effect-lib"
import { Schema } from "effect"
import { TransactionId } from "../../lib/schema"
import { AuthMiddleware } from "../middleware/auth-class"

/**
 * Response schema for successful organization operations.
 * Contains the organization data and a transaction ID for optimistic updates.
 */
export class OrganizationResponse extends Schema.Class<OrganizationResponse>("OrganizationResponse")({
	data: Organization.Model.json,
	transactionId: TransactionId,
}) {}

/**
 * Error thrown when an organization is not found.
 * Used in update and delete operations.
 */
export class OrganizationNotFoundError extends Schema.TaggedError<OrganizationNotFoundError>()(
	"OrganizationNotFoundError",
	{
		organizationId: OrganizationId,
	},
) {}

/**
 * Error thrown when trying to create or update an organization with a slug that already exists.
 */
export class OrganizationSlugAlreadyExistsError extends Schema.TaggedError<OrganizationSlugAlreadyExistsError>()(
	"OrganizationSlugAlreadyExistsError",
	{
		message: Schema.String,
		slug: Schema.String,
	},
) {}

export class OrganizationRpcs extends RpcGroup.make(
	/**
	 * OrganizationCreate
	 *
	 * Creates a new organization.
	 * Requires appropriate permissions to create organizations.
	 *
	 * @param payload - Organization data (workosId, name, slug, etc.)
	 * @returns Organization data and transaction ID
	 * @throws OrganizationSlugAlreadyExistsError if slug is already taken
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("organization.create", {
		payload: Organization.Model.jsonCreate,
		success: OrganizationResponse,
		error: Schema.Union(OrganizationSlugAlreadyExistsError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),

	/**
	 * OrganizationUpdate
	 *
	 * Updates an existing organization.
	 * Only users with appropriate permissions can update an organization.
	 *
	 * @param payload - Organization ID and fields to update
	 * @returns Updated organization data and transaction ID
	 * @throws OrganizationNotFoundError if organization doesn't exist
	 * @throws OrganizationSlugAlreadyExistsError if new slug is already taken
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("organization.update", {
		payload: Schema.Struct({
			id: OrganizationId,
			...Organization.Model.jsonUpdate.fields,
		}),
		success: OrganizationResponse,
		error: Schema.Union(
			OrganizationNotFoundError,
			OrganizationSlugAlreadyExistsError,
			UnauthorizedError,
			InternalServerError,
		),
	}).middleware(AuthMiddleware),

	/**
	 * OrganizationDelete
	 *
	 * Deletes an organization (soft delete).
	 * Only users with appropriate permissions can delete an organization.
	 *
	 * @param payload - Organization ID to delete
	 * @returns Transaction ID
	 * @throws OrganizationNotFoundError if organization doesn't exist
	 * @throws UnauthorizedError if user lacks permission
	 * @throws InternalServerError for unexpected errors
	 */
	Rpc.make("organization.delete", {
		payload: Schema.Struct({ id: OrganizationId }),
		success: Schema.Struct({ transactionId: TransactionId }),
		error: Schema.Union(OrganizationNotFoundError, UnauthorizedError, InternalServerError),
	}).middleware(AuthMiddleware),
) {}
