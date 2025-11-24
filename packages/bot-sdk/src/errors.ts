import { Schema } from "effect"

/**
 * Error thrown when queue operations fail
 */
export class QueueError extends Schema.TaggedError<QueueError>()("QueueError", {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

/**
 * Error thrown when shape stream subscription fails
 */
export class ShapeStreamError extends Schema.TaggedError<ShapeStreamError>()("ShapeStreamError", {
	message: Schema.String,
	table: Schema.String,
	cause: Schema.Unknown,
}) {}

/**
 * Error thrown when event handler execution fails
 */
export class HandlerError extends Schema.TaggedError<HandlerError>()("HandlerError", {
	message: Schema.String,
	eventType: Schema.String,
	cause: Schema.Unknown,
}) {}

/**
 * Error thrown when bot authentication fails
 */
export class AuthenticationError extends Schema.TaggedError<AuthenticationError>()("AuthenticationError", {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

/**
 * Error thrown when bot client fails to start
 */
export class BotStartError extends Schema.TaggedError<BotStartError>()("BotStartError", {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

/**
 * Error thrown when message operations fail
 */
export class MessageOperationError extends Schema.TaggedError<MessageOperationError>()(
	"MessageOperationError",
	{
		message: Schema.String,
		operation: Schema.String,
		cause: Schema.Unknown,
	},
) {}

/**
 * Error thrown when event dispatcher operations fail
 */
export class DispatchError extends Schema.TaggedError<DispatchError>()("DispatchError", {
	message: Schema.String,
	eventType: Schema.String,
	cause: Schema.Unknown,
}) {}
