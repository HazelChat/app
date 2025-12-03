import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import * as CurrentUser from "../current-user"
import { InternalServerError, UnauthorizedError } from "../errors"
import { ChannelId } from "../ids"
import { IntegrationConnection } from "../models"

// Provider type from the model
const IntegrationProvider = IntegrationConnection.IntegrationProvider

// ============ REQUEST SCHEMAS ============

export const CommandArgumentValue = Schema.Struct({
	name: Schema.String,
	value: Schema.String,
})
export type CommandArgumentValue = typeof CommandArgumentValue.Type

export class ExecuteCommandRequest extends Schema.Class<ExecuteCommandRequest>("ExecuteCommandRequest")({
	channelId: ChannelId,
	arguments: Schema.Array(CommandArgumentValue),
}) {}

// ============ RESPONSE SCHEMAS ============

export class LinearIssueCreatedResponse extends Schema.Class<LinearIssueCreatedResponse>(
	"LinearIssueCreatedResponse",
)({
	id: Schema.String,
	identifier: Schema.String,
	title: Schema.String,
	url: Schema.String,
	teamName: Schema.String,
}) {}

// Union of all possible command execution results
export const CommandExecutionResult = Schema.Union(
	LinearIssueCreatedResponse,
	// Add more result types here for other integrations (GitHub, Figma, etc.)
)
export type CommandExecutionResult = typeof CommandExecutionResult.Type

// Command argument definition
export const CommandArgumentSchema = Schema.Struct({
	name: Schema.String,
	description: Schema.NullishOr(Schema.String),
	required: Schema.Boolean,
	placeholder: Schema.NullishOr(Schema.String),
	type: Schema.Literal("string", "number", "user", "channel"),
})
export type CommandArgumentSchema = typeof CommandArgumentSchema.Type

// Bot info for command
export const CommandBotSchema = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	avatarUrl: Schema.NullishOr(Schema.String),
})
export type CommandBotSchema = typeof CommandBotSchema.Type

// Full command definition
export const IntegrationCommandSchema = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	description: Schema.String,
	provider: IntegrationProvider,
	arguments: Schema.Array(CommandArgumentSchema),
	usageExample: Schema.NullishOr(Schema.String),
	bot: CommandBotSchema,
})
export type IntegrationCommandSchema = typeof IntegrationCommandSchema.Type

export class AvailableCommandsResponse extends Schema.Class<AvailableCommandsResponse>(
	"AvailableCommandsResponse",
)({
	commands: Schema.Array(IntegrationCommandSchema),
}) {}

// ============ ERROR TYPES ============

export class CommandNotFoundError extends Schema.TaggedError<CommandNotFoundError>()("CommandNotFoundError", {
	commandId: Schema.String,
	provider: IntegrationProvider,
}) {}

export class CommandExecutionError extends Schema.TaggedError<CommandExecutionError>()(
	"CommandExecutionError",
	{
		commandId: Schema.String,
		message: Schema.String,
		details: Schema.NullishOr(Schema.String),
	},
) {}

export class IntegrationNotConnectedForCommandError extends Schema.TaggedError<IntegrationNotConnectedForCommandError>()(
	"IntegrationNotConnectedForCommandError",
	{
		provider: IntegrationProvider,
	},
) {}

export class MissingRequiredArgumentError extends Schema.TaggedError<MissingRequiredArgumentError>()(
	"MissingRequiredArgumentError",
	{
		argumentName: Schema.String,
		commandId: Schema.String,
	},
) {}

// ============ API GROUP ============

export class IntegrationCommandGroup extends HttpApiGroup.make("integration-commands")
	// Get available commands for the current organization
	.add(
		HttpApiEndpoint.get("getAvailableCommands", `/commands`)
			.addSuccess(AvailableCommandsResponse)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.annotateContext(
				OpenApi.annotations({
					title: "Get Available Commands",
					description: "Get all slash commands available for connected integrations",
					summary: "List integration commands",
				}),
			),
	)
	// Execute a command
	.add(
		HttpApiEndpoint.post("executeCommand", `/:provider/commands/:commandId/execute`)
			.addSuccess(CommandExecutionResult)
			.addError(CommandNotFoundError)
			.addError(CommandExecutionError)
			.addError(IntegrationNotConnectedForCommandError)
			.addError(MissingRequiredArgumentError)
			.addError(UnauthorizedError)
			.addError(InternalServerError)
			.setPath(
				Schema.Struct({
					provider: IntegrationProvider,
					commandId: Schema.String,
				}),
			)
			.setPayload(ExecuteCommandRequest)
			.annotateContext(
				OpenApi.annotations({
					title: "Execute Command",
					description: "Execute an integration slash command",
					summary: "Execute integration command",
				}),
			),
	)
	.prefix("/integrations")
	.middleware(CurrentUser.Authorization) {}
