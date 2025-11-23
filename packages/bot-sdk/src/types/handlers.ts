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
	"messages.insert": Set<MessageHandler<any>>
	"messages.update": Set<MessageUpdateHandler<any>>
	"messages.delete": Set<MessageDeleteHandler<any>>
	"channel_members.insert": Set<ChannelMemberAddedHandler<any>>
	"channel_members.delete": Set<ChannelMemberRemovedHandler<any>>
	"channels.insert": Set<ChannelCreatedHandler<any>>
	"channels.update": Set<ChannelUpdatedHandler<any>>
	"channels.delete": Set<ChannelDeletedHandler<any>>
}
