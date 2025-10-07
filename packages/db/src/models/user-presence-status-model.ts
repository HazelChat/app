import { ChannelId, UserId, UserPresenceStatusId } from "@hazel/effect-lib"
import { Schema } from "effect"
import * as M from "../services/model"
import { JsonDate } from "./utils"

export const UserPresenceStatusEnum = Schema.Literal("online", "away", "busy", "dnd", "offline")
export type UserPresenceStatusEnum = Schema.Schema.Type<typeof UserPresenceStatusEnum>

export class Model extends M.Class<Model>("UserPresenceStatus")({
	id: M.Generated(UserPresenceStatusId),
	userId: UserId,
	status: UserPresenceStatusEnum,
	customMessage: Schema.NullOr(Schema.String),
	activeChannelId: Schema.NullOr(ChannelId),
	updatedAt: JsonDate,
}) {}

export const Insert = Model.insert
export const Update = Model.update
