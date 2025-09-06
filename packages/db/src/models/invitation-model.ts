import { Schema } from "effect"
import { InvitationId, OrganizationId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { baseFields } from "./utils"

export const InvitationStatus = Schema.Literal("pending", "accepted", "expired", "revoked")
export type InvitationStatus = Schema.Schema.Type<typeof InvitationStatus>

export class Model extends M.Class<Model>("Invitation")({
	id: M.Generated(InvitationId),
	workosInvitationId: Schema.String,
	organizationId: OrganizationId,
	email: Schema.String,
	invitedBy: Schema.NullOr(UserId),
	invitedAt: Schema.Date,
	expiresAt: Schema.Date,
	status: InvitationStatus,
	acceptedAt: Schema.NullOr(Schema.Date),
	acceptedBy: Schema.NullOr(UserId),
}) {}

export const Insert = Model.insert
export const Update = Model.update
