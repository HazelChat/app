import { RpcServer } from "@effect/rpc"
import { Layer } from "effect"
import { ChannelMemberRpcs } from "./groups/channel-members"
import { ChannelRpcs } from "./groups/channels"
import { InvitationRpcs } from "./groups/invitations"
import { MessageReactionRpcs } from "./groups/message-reactions"
import { MessageRpcs } from "./groups/messages"
import { NotificationRpcs } from "./groups/notifications"
import { OrganizationMemberRpcs } from "./groups/organization-members"
import { OrganizationRpcs } from "./groups/organizations"
import { PinnedMessageRpcs } from "./groups/pinned-messages"
import { TypingIndicatorRpcs } from "./groups/typing-indicators"
import { UserRpcs } from "./groups/users"
import { ChannelMemberRpcLive } from "./handlers/channel-members"
import { ChannelRpcLive } from "./handlers/channels"
import { InvitationRpcLive } from "./handlers/invitations"
import { MessageReactionRpcLive } from "./handlers/message-reactions"
import { MessageRpcLive } from "./handlers/messages"
import { NotificationRpcLive } from "./handlers/notifications"
import { OrganizationMemberRpcLive } from "./handlers/organization-members"
import { OrganizationRpcLive } from "./handlers/organizations"
import { PinnedMessageRpcLive } from "./handlers/pinned-messages"
import { TypingIndicatorRpcLive } from "./handlers/typing-indicators"
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
 * Current RPC Groups:
 * - MessageRpcs: Message CRUD operations (create, update, delete)
 * - MessageReactionRpcs: Message reaction operations (create, update, delete)
 * - NotificationRpcs: Notification operations (create, update, delete)
 * - InvitationRpcs: Invitation operations (create, update, delete)
 * - TypingIndicatorRpcs: Typing indicator operations (create, update, delete)
 * - PinnedMessageRpcs: Pinned message operations (create, update, delete)
 * - OrganizationRpcs: Organization management (create, update, delete)
 * - OrganizationMemberRpcs: Organization member operations (create, update, delete)
 * - UserRpcs: User operations (create, update, delete)
 * - ChannelRpcs: Channel operations (create, update, delete, createDm)
 * - ChannelMemberRpcs: Channel member operations (create, update, delete)
 */

/**
 * Combined RPC Group
 *
 * Merges all RPC groups into a single group.
 * New RPC groups should be added here as they're migrated from HttpApi.
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
	ChannelRpcs,
	ChannelMemberRpcs,
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
	Layer.provideMerge(ChannelRpcLive),
	Layer.provideMerge(ChannelMemberRpcLive),
	Layer.provideMerge(AuthMiddlewareLive),
)
