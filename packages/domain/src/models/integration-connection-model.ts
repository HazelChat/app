import { IntegrationConnectionId, OrganizationId, UserId } from "@hazel/schema"
import { Schema } from "effect"
import * as M from "./utils"
import { JsonDate } from "./utils"

export const IntegrationProvider = Schema.Literal("linear", "github", "figma", "notion")
export type IntegrationProvider = Schema.Schema.Type<typeof IntegrationProvider>

export const ConnectionLevel = Schema.Literal("organization", "user")
export type ConnectionLevel = Schema.Schema.Type<typeof ConnectionLevel>

export const ConnectionStatus = Schema.Literal("active", "expired", "revoked", "error")
export type ConnectionStatus = Schema.Schema.Type<typeof ConnectionStatus>

export class Model extends M.Class<Model>("IntegrationConnection")({
	id: M.Generated(IntegrationConnectionId),
	provider: IntegrationProvider,
	organizationId: OrganizationId,
	userId: Schema.NullOr(UserId),
	level: ConnectionLevel,
	status: ConnectionStatus,
	externalAccountId: Schema.NullOr(Schema.String),
	externalAccountName: Schema.NullOr(Schema.String),
	connectedBy: UserId,
	settings: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	errorMessage: Schema.NullOr(Schema.String),
	lastUsedAt: Schema.NullOr(JsonDate),
	createdAt: M.Generated(JsonDate),
	updatedAt: M.Generated(Schema.NullOr(JsonDate)),
	deletedAt: M.GeneratedByApp(Schema.NullOr(JsonDate)),
}) {}

export const Insert = Model.insert
export const Update = Model.update
