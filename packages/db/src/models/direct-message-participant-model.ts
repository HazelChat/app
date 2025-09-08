import { ChannelId, DirectMessageParticipantId, OrganizationId, UserId } from "../lib/schema"
import * as M from "../services/model"

export class Model extends M.Class<Model>("DirectMessageParticipant")({
	id: M.Generated(DirectMessageParticipantId),
	channelId: ChannelId,
	userId: M.GeneratedByApp(UserId),
	organizationId: OrganizationId,
}) {}

export const Insert = Model.insert
export const Update = Model.update
