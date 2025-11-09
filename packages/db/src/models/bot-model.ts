import { BotId, UserId } from "@hazel/effect-lib"
import { Schema } from "effect"
import * as M from "../services/model"
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
	...baseFields,
}) {}

export const Insert = Model.insert
export const Update = Model.update
