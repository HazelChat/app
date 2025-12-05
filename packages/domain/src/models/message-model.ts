import { AttachmentId, ChannelId, MessageId, UserId } from "@hazel/schema"
import { Schema } from "effect"
import { MessageEmbeds } from "./message-embed-schema"
import * as M from "./utils"
import { baseFields } from "./utils"

export class Model extends M.Class<Model>("Message")({
	id: M.Generated(MessageId),
	channelId: ChannelId,
	authorId: M.GeneratedByApp(UserId),
	content: Schema.String,
	embeds: Schema.NullOr(MessageEmbeds),
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
