import { Schema } from "effect"
import { ChannelId, OrganizationId } from "../lib/schema"
import * as schema from "../schema"
import { DrizzleEffect, Model as M } from "../services"
import { baseFields } from "./utils"

export const ChannelType = Schema.Literal("public", "private", "thread", "direct", "single")
export type ChannelType = Schema.Schema.Type<typeof ChannelType>

export class Model extends M.Class<Model>("Channel")({
	...DrizzleEffect.createSelectSchema(schema.channelsTable).fields,
	id: M.Generated(ChannelId),
	organizationId: M.GeneratedByApp(OrganizationId),
	type: ChannelType,
	parentChannelId: M.GeneratedByApp(Schema.NullOr(ChannelId)),
	...baseFields,
}) {}

export const Insert = Model.insert
export const Update = Model.update
