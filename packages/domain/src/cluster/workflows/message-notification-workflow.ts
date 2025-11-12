import { Workflow } from "@effect/workflow"
import { ChannelId, MessageId, UserId } from "@hazel/schema"
import type { Schema } from "effect"

// Message notification workflow - triggered when a new message is created
// Notifies all channel members who have notifications enabled
export const MessageNotificationWorkflow = Workflow.make({
	name: "MessageNotificationWorkflow",
	payload: {
		messageId: MessageId,
		channelId: ChannelId,
		authorId: UserId,
	},
	// Process each message only once
	idempotencyKey: (payload) => payload.messageId,
})

export type MessageNotificationWorkflowPayload = Schema.Schema.Type<
	typeof MessageNotificationWorkflow.payloadSchema
>
