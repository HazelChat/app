import { UserId } from "@hazel/effect-lib"
import { Schema } from "effect"
import * as M from "../services/model"
import { baseFields, JsonDate } from "./utils"

export const UserStatus = Schema.Literal("online", "offline", "away")
export type UserStatus = Schema.Schema.Type<typeof UserStatus>

export const UserType = Schema.Literal("user", "machine")
export type UserType = Schema.Schema.Type<typeof UserType>

export class Model extends M.Class<Model>("User")({
	id: M.Generated(UserId),
	externalId: Schema.String,
	email: Schema.String,
	firstName: Schema.String,
	lastName: Schema.String,
	avatarUrl: Schema.String,
	userType: UserType,
	status: UserStatus,
	lastSeen: JsonDate,
	settings: Schema.NullOr(
		Schema.Record({
			key: Schema.String,
			value: Schema.Unknown,
		}),
	),
	...baseFields,
}) {}

export const Insert = Model.insert
export const Update = Model.update
