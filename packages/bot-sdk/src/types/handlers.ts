import type { Channel, ChannelMember, Message } from "@hazel/domain/models"
import type { Effect, Schema } from "effect"
import type { HandlerError } from "../errors.ts"

/**
 * Handler for new messages
 */
export type MessageHandler<R = never> = (
	message: Schema.Schema.Type<typeof Message.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for message updates
 */
export type MessageUpdateHandler<R = never> = (
	message: Schema.Schema.Type<typeof Message.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for message deletes
 */
export type MessageDeleteHandler<R = never> = (
	message: Schema.Schema.Type<typeof Message.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for new channel members
 */
export type ChannelMemberAddedHandler<R = never> = (
	member: Schema.Schema.Type<typeof ChannelMember.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for removed channel members
 */
export type ChannelMemberRemovedHandler<R = never> = (
	member: Schema.Schema.Type<typeof ChannelMember.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for new channels
 */
export type ChannelCreatedHandler<R = never> = (
	channel: Schema.Schema.Type<typeof Channel.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for channel updates
 */
export type ChannelUpdatedHandler<R = never> = (
	channel: Schema.Schema.Type<typeof Channel.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Handler for channel deletes
 */
export type ChannelDeletedHandler<R = never> = (
	channel: Schema.Schema.Type<typeof Channel.Model.json>,
) => Effect.Effect<void, HandlerError, R>

/**
 * Registry of all event handlers
 */
export interface EventHandlerRegistry {
	"message.insert": Set<MessageHandler<any>>
	"message.update": Set<MessageUpdateHandler<any>>
	"message.delete": Set<MessageDeleteHandler<any>>
	"channel_member.insert": Set<ChannelMemberAddedHandler<any>>
	"channel_member.delete": Set<ChannelMemberRemovedHandler<any>>
	"channel.insert": Set<ChannelCreatedHandler<any>>
	"channel.update": Set<ChannelUpdatedHandler<any>>
	"channel.delete": Set<ChannelDeletedHandler<any>>
}
