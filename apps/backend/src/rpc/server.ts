import { RpcServer } from "@effect/rpc"
import { Layer } from "effect"
import { AttachmentRpcs } from "./groups/attachments"
import { ChannelMemberRpcs } from "./groups/channel-members"
import { ChannelRpcs } from "./groups/channels"
import { DirectMessageParticipantRpcs } from "./groups/direct-message-participants"
import { InvitationRpcs } from "./groups/invitations"
import { MessageReactionRpcs } from "./groups/message-reactions"
import { MessageRpcs } from "./groups/messages"
import { NotificationRpcs } from "./groups/notifications"
import { OrganizationMemberRpcs } from "./groups/organization-members"
import { OrganizationRpcs } from "./groups/organizations"
import { PinnedMessageRpcs } from "./groups/pinned-messages"
import { TypingIndicatorRpcs } from "./groups/typing-indicators"
import { UserPresenceStatusRpcs } from "./groups/user-presence-status"
import { UserRpcs } from "./groups/users"
import { AttachmentRpcLive } from "./handlers/attachments"
import { ChannelMemberRpcLive } from "./handlers/channel-members"
import { ChannelRpcLive } from "./handlers/channels"
import { DirectMessageParticipantRpcLive } from "./handlers/direct-message-participants"
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
	AttachmentRpcs,
	DirectMessageParticipantRpcs,
)

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
	Layer.provideMerge(AttachmentRpcLive),
	Layer.provideMerge(DirectMessageParticipantRpcLive),
	Layer.provideMerge(AuthMiddlewareLive),
)
