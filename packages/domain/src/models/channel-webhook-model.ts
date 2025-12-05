import { ChannelId, ChannelWebhookId, OrganizationId, UserId } from "@hazel/schema"
import { Schema } from "effect"
import * as M from "./utils"
import { baseFields, JsonDate } from "./utils"

export class Model extends M.Class<Model>("ChannelWebhook")({
	id: M.Generated(ChannelWebhookId),
	channelId: ChannelId,
	organizationId: OrganizationId,
	botUserId: UserId,
	name: Schema.String,
	description: Schema.NullOr(Schema.String),
	avatarUrl: Schema.NullOr(Schema.String),
	tokenHash: M.Sensitive(Schema.String),
	tokenSuffix: Schema.String,
	isEnabled: Schema.Boolean,
	createdBy: UserId,
	lastUsedAt: Schema.NullOr(JsonDate),
	...baseFields,
}) {}

export const Insert = Model.insert
export const Update = Model.update
