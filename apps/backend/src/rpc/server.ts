import { RpcServer } from "@effect/rpc"
import {
	AttachmentRpcs,
	ChannelMemberRpcs,
	ChannelRpcs,
	ChannelWebhookRpcs,
	InvitationRpcs,
	MessageReactionRpcs,
	MessageRpcs,
	NotificationRpcs,
	OrganizationMemberRpcs,
	OrganizationRpcs,
	PinnedMessageRpcs,
	TypingIndicatorRpcs,
	UserPresenceStatusRpcs,
	UserRpcs,
} from "@hazel/domain/rpc"
import { Layer } from "effect"
import { AttachmentRpcLive } from "./handlers/attachments"
import { ChannelMemberRpcLive } from "./handlers/channel-members"
import { ChannelWebhookRpcLive } from "./handlers/channel-webhooks"
import { ChannelRpcLive } from "./handlers/channels"
import { InvitationRpcLive } from "./handlers/invitations"
import { MessageReactionRpcLive } from "./handlers/message-reactions"
import { MessageRpcLive } from "./handlers/messages"
import { NotificationRpcLive } from "./handlers/notifications"
import { OrganizationMemberRpcLive } from "./handlers/organization-members"
import { OrganizationRpcLive } from "./handlers/organizations"
import { PinnedMessageRpcLive } from "./handlers/pinned-messages"
import { TypingIndicatorRpcLive } from "./handlers/typing-indicators"
import { UserPresenceStatusRpcLive } from "./handlers/user-presence-status"
import { UserRpcLive } from "./handlers/users"
import { AuthMiddlewareLive } from "./middleware/auth"
import { RpcLoggingMiddlewareLive } from "./middleware/logging"
import { RpcLoggingMiddleware } from "./middleware/logging-class"

/**
 * RPC Server Configuration
 *
 * This file sets up the Effect RPC server with all RPC groups and their handlers.
 *
 * Architecture:
 * 1. Define RPC groups (in ./groups/*.ts) - API schema definitions
 * 2. Implement handlers (in ./handlers/*.ts) - Business logic
 * 3. Combine into server layer (here) - Server setup
 * 4. Add HTTP protocol (in index.ts) - Transport layer
 *
 */

export const AllRpcs = MessageRpcs.merge(
	MessageReactionRpcs,
	NotificationRpcs,
	InvitationRpcs,
	TypingIndicatorRpcs,
	PinnedMessageRpcs,
	OrganizationRpcs,
	OrganizationMemberRpcs,
	UserRpcs,
	UserPresenceStatusRpcs,
	ChannelRpcs,
	ChannelMemberRpcs,
	ChannelWebhookRpcs,
	AttachmentRpcs,
).middleware(RpcLoggingMiddleware)

export const RpcServerLive = Layer.empty.pipe(
	Layer.provideMerge(MessageRpcLive),
	Layer.provideMerge(MessageReactionRpcLive),
	Layer.provideMerge(NotificationRpcLive),
	Layer.provideMerge(InvitationRpcLive),
	Layer.provideMerge(TypingIndicatorRpcLive),
	Layer.provideMerge(PinnedMessageRpcLive),
	Layer.provideMerge(OrganizationRpcLive),
	Layer.provideMerge(OrganizationMemberRpcLive),
	Layer.provideMerge(UserRpcLive),
	Layer.provideMerge(UserPresenceStatusRpcLive),
	Layer.provideMerge(ChannelRpcLive),
	Layer.provideMerge(ChannelMemberRpcLive),
	Layer.provideMerge(ChannelWebhookRpcLive),
	Layer.provideMerge(AttachmentRpcLive),
	Layer.provideMerge(AuthMiddlewareLive),
	Layer.provideMerge(RpcLoggingMiddlewareLive),
)
