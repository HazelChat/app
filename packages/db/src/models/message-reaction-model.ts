import { Schema } from "effect"
import { MessageId, MessageReactionId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { JsonDate } from "./utils"

export class Model extends M.Class<Model>("MessageReaction")({
	id: M.Generated(MessageReactionId),
	messageId: MessageId,
	userId: M.GeneratedByApp(UserId),
	emoji: Schema.String,
	createdAt: M.Generated(JsonDate),
}) {}

export const Insert = Model.insert
export const Update = Model.update
