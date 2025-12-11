import { AttachmentId, ChannelId, MessageId, OrganizationId, UserId } from "@hazel/schema"
import { Schema } from "effect"
import * as M from "./utils"
import { JsonDate } from "./utils"

export const AttachmentStatus = Schema.Literal("uploading", "complete", "failed")
export type AttachmentStatus = Schema.Schema.Type<typeof AttachmentStatus>

export class Model extends M.Class<Model>("Attachment")({
	id: M.GeneratedByApp(AttachmentId),
	organizationId: OrganizationId,
	channelId: Schema.NullOr(ChannelId),
	messageId: Schema.NullOr(MessageId),
	fileName: Schema.String,
	fileSize: Schema.Number,
	uploadedBy: M.GeneratedByApp(UserId),
	status: AttachmentStatus,
	uploadedAt: JsonDate,
	deletedAt: M.Generated(Schema.NullOr(JsonDate)),
}) {}

export const Insert = Model.insert
export const Update = Model.update
