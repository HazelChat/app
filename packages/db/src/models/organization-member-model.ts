import { Schema } from "effect"
import { OrganizationId, OrganizationMemberId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { baseFields, JsonDate } from "./utils"

export const OrganizationRole = Schema.Literal("admin", "member", "owner")
export type OrganizationRole = Schema.Schema.Type<typeof OrganizationRole>

export class Model extends M.Class<Model>("OrganizationMember")({
	id: M.Generated(OrganizationMemberId),
	organizationId: OrganizationId,
	userId: M.GeneratedByApp(UserId),
	role: OrganizationRole,
	joinedAt: JsonDate,
	invitedBy: Schema.NullOr(UserId),
	deletedAt: Schema.NullOr(JsonDate),
	createdAt: M.Generated(JsonDate),
}) {}

export const Insert = Model.insert
export const Update = Model.update
