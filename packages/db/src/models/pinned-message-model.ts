import { ChannelId, MessageId, PinnedMessageId, UserId } from "../lib/schema"
import * as M from "../services/model"
import { JsonDate } from "./utils"

export class Model extends M.Class<Model>("PinnedMessage")({
	id: M.Generated(PinnedMessageId),
	channelId: ChannelId,
	messageId: MessageId,
	pinnedBy: M.GeneratedByApp(UserId),
	pinnedAt: JsonDate,
}) {}

export const Insert = Model.insert
export const Update = Model.update
