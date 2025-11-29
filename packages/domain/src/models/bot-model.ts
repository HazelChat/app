import { BotId, UserId } from "@hazel/schema"
import { Schema } from "effect"
import { IntegrationProvider } from "./integration-connection-model"
import * as M from "./utils"
import { baseFields, JsonDate } from "./utils"

export class Model extends M.Class<Model>("Bot")({
	id: M.Generated(BotId),
	userId: UserId,
	createdBy: UserId,
	name: Schema.String,
	description: Schema.NullOr(Schema.String),
	webhookUrl: Schema.NullOr(Schema.String),
	apiTokenHash: Schema.String,
	scopes: Schema.NullOr(Schema.Array(Schema.String)),
	metadata: Schema.NullOr(
		Schema.Record({
			key: Schema.String,
			value: Schema.Unknown,
		}),
	),
	isPublic: Schema.Boolean,
	installCount: Schema.Number,
	// List of integration providers this bot is allowed to use (e.g., ["linear", "github"])
	allowedIntegrations: Schema.NullOr(Schema.Array(IntegrationProvider)),
	...baseFields,
}) {}

export const Insert = Model.insert
export const Update = Model.update
