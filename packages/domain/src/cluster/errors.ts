import { Schema } from "effect"

// Generic workflow and activity errors - kept for potential future use
export class WorkflowExecutionError extends Schema.TaggedError<WorkflowExecutionError>()(
	"WorkflowExecutionError",
	{
		workflowId: Schema.String,
		message: Schema.String,
		cause: Schema.Unknown.pipe(Schema.optional),
	},
) {}

export class ActivityExecutionError extends Schema.TaggedError<ActivityExecutionError>()(
	"ActivityExecutionError",
	{
		activityName: Schema.String,
		message: Schema.String,
		retryCount: Schema.Number,
	},
) {}
