import { Schema } from "effect"
import { AttachmentId, ChannelId, MessageId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { baseFields } from "./utils"

export class Model extends M.Class<Model>("Message")({
	id: M.Generated(MessageId),
	channelId: ChannelId,
	authorId: M.GeneratedByApp(UserId),
	content: Schema.String,
	replyToMessageId: Schema.NullOr(MessageId),
	threadChannelId: Schema.NullOr(ChannelId),
	...baseFields,
}) {}

// Custom insert schema that includes attachmentIds for linking
export const Insert = Schema.Struct({
	...Model.insert.fields,
	attachmentIds: Schema.optional(Schema.Array(AttachmentId)),
})

export const Update = Model.update
