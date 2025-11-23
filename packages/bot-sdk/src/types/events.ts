import type { Channel, ChannelMember, Message } from "@hazel/domain/models"
import { Schema } from "effect"

/**
 * Base event structure from Electric SQL shape stream
 */
export interface BaseElectricEvent<TOperation extends string, TValue> {
	readonly operation: TOperation
	readonly table: string
	readonly value: TValue
	readonly timestamp: Date
}

/**
 * Message insert event
 */
export interface MessageInsertEvent
	extends BaseElectricEvent<"insert", Schema.Schema.Type<typeof Message.Model.json>> {}

/**
 * Message update event
 */
export interface MessageUpdateEvent
	extends BaseElectricEvent<"update", Schema.Schema.Type<typeof Message.Model.json>> {}

/**
 * Message delete event
 */
export interface MessageDeleteEvent
	extends BaseElectricEvent<"delete", Schema.Schema.Type<typeof Message.Model.json>> {}

/**
 * Channel member added event
 */
export interface ChannelMemberAddedEvent
	extends BaseElectricEvent<"insert", Schema.Schema.Type<typeof ChannelMember.Model.json>> {}

/**
 * Channel member removed event
 */
export interface ChannelMemberRemovedEvent
	extends BaseElectricEvent<"delete", Schema.Schema.Type<typeof ChannelMember.Model.json>> {}

/**
 * Channel created event
 */
export interface ChannelCreatedEvent
	extends BaseElectricEvent<"insert", Schema.Schema.Type<typeof Channel.Model.json>> {}

/**
 * Channel updated event
 */
export interface ChannelUpdatedEvent
	extends BaseElectricEvent<"update", Schema.Schema.Type<typeof Channel.Model.json>> {}

/**
 * Channel deleted event
 */
export interface ChannelDeletedEvent
	extends BaseElectricEvent<"delete", Schema.Schema.Type<typeof Channel.Model.json>> {}

/**
 * Union type of all possible Electric events
 */
export type ElectricEvent =
	| MessageInsertEvent
	| MessageUpdateEvent
	| MessageDeleteEvent
	| ChannelMemberAddedEvent
	| ChannelMemberRemovedEvent
	| ChannelCreatedEvent
	| ChannelUpdatedEvent
	| ChannelDeletedEvent

/**
 * Event type discriminator
 */
export type EventType =
	| "messages.insert"
	| "messages.update"
	| "messages.delete"
	| "channel_members.insert"
	| "channel_members.delete"
	| "channels.insert"
	| "channels.update"
	| "channels.delete"

/**
 * Schema for validating event types
 */
export const EventTypeSchema = Schema.Literal(
	"messages.insert",
	"messages.update",
	"messages.delete",
	"channel_members.insert",
	"channel_members.delete",
	"channels.insert",
	"channels.update",
	"channels.delete",
)

/**
 * Helper to create event type from table and operation
 */
export function getEventType(table: string, operation: string): EventType | null {
	const key = `${table}.${operation}` as EventType
	if (Schema.is(EventTypeSchema)(key)) {
		return key
	}
	return null
}

/**
 * Helper to determine if an event is a message event
 */
export function isMessageEvent(
	event: ElectricEvent,
): event is MessageInsertEvent | MessageUpdateEvent | MessageDeleteEvent {
	return event.table === "messages"
}

/**
 * Helper to determine if an event is a channel event
 */
export function isChannelEvent(
	event: ElectricEvent,
): event is ChannelCreatedEvent | ChannelUpdatedEvent | ChannelDeletedEvent {
	return event.table === "channels"
}

/**
 * Helper to determine if an event is a channel member event
 */
export function isChannelMemberEvent(
	event: ElectricEvent,
): event is ChannelMemberAddedEvent | ChannelMemberRemovedEvent {
	return event.table === "channel_members"
}
