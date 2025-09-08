import { Schema } from "effect"
import { AttachmentId, ChannelId, MessageId, OrganizationId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { JsonDate } from "./utils"

export const AttachmentStatus = Schema.Literal("uploading", "complete", "failed")
export type AttachmentStatus = Schema.Schema.Type<typeof AttachmentStatus>

export class Model extends M.Class<Model>("Attachment")({
	id: M.Generated(AttachmentId),
	organizationId: OrganizationId,
	channelId: Schema.NullOr(ChannelId),
	messageId: Schema.NullOr(MessageId),
	fileName: Schema.String,
	r2Key: Schema.String,
	uploadedBy: M.GeneratedByApp(UserId),
	status: AttachmentStatus,
	uploadedAt: JsonDate,
}) {}

export const Insert = Model.insert
export const Update = Model.update
