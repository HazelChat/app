import { Schema } from "effect"
import { OrganizationId, OrganizationMemberId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { baseFields } from "./utils"

export const OrganizationRole = Schema.Literal("admin", "member", "owner")
export type OrganizationRole = Schema.Schema.Type<typeof OrganizationRole>

export class Model extends M.Class<Model>("OrganizationMember")({
	id: M.Generated(OrganizationMemberId),
	organizationId: OrganizationId,
	userId: UserId,
	role: OrganizationRole,
	joinedAt: Schema.Date,
	invitedBy: Schema.NullOr(UserId),
	deletedAt: Schema.NullOr(Schema.Date),
	createdAt: Schema.Date,
}) {}

export const Insert = Model.insert
export const Update = Model.update
