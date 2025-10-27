import * as BrowserSocket from "@effect/platform-browser/BrowserSocket"
import { RpcClient as RpcClientBuilder, RpcSerialization } from "@effect/rpc"
import { AttachmentRpcs } from "@hazel/backend/rpc/groups/attachments"
import { ChannelMemberRpcs } from "@hazel/backend/rpc/groups/channel-members"
import { ChannelRpcs } from "@hazel/backend/rpc/groups/channels"
import { DirectMessageParticipantRpcs } from "@hazel/backend/rpc/groups/direct-message-participants"
import { InvitationRpcs } from "@hazel/backend/rpc/groups/invitations"
import { MessageReactionRpcs } from "@hazel/backend/rpc/groups/message-reactions"
import { MessageRpcs } from "@hazel/backend/rpc/groups/messages"
import { NotificationRpcs } from "@hazel/backend/rpc/groups/notifications"
import { OrganizationMemberRpcs } from "@hazel/backend/rpc/groups/organization-members"
import { OrganizationRpcs } from "@hazel/backend/rpc/groups/organizations"
import { PinnedMessageRpcs } from "@hazel/backend/rpc/groups/pinned-messages"
import { TypingIndicatorRpcs } from "@hazel/backend/rpc/groups/typing-indicators"
import { UserPresenceStatusRpcs } from "@hazel/backend/rpc/groups/user-presence-status"
import { UserRpcs } from "@hazel/backend/rpc/groups/users"
import { AuthMiddlewareClientLive } from "@hazel/backend/rpc/middleware/client"
import { Effect, Layer } from "effect"

/**
 * RPC WebSocket Protocol Layer
 *
 * Creates a persistent WebSocket connection to the backend RPC server.
 * Benefits over HTTP:
 * - Instant offline detection (< 1s vs 30-60s polling)
 * - Bi-directional real-time communication
 * - Automatic reconnection on connection loss (retries every 1s)
 * - Lower overhead (persistent connection vs repeated HTTP requests)
 *
 * Authentication is handled via cookies which are automatically sent
 * during the WebSocket upgrade request.
 *
 * Uses BrowserSocket.layerWebSocket which provides the browser's native
 * WebSocket constructor automatically.
 */

// Convert HTTP URL to WebSocket URL (http -> ws, https -> wss)
const backendUrl = import.meta.env.VITE_BACKEND_URL
const wsUrl = `${backendUrl.replace(/^http/, "ws")}/rpc`

export const RpcProtocolLive = RpcClientBuilder.layerProtocolSocket({
	retryTransientErrors: true, // Auto-reconnect on connection issues
}).pipe(Layer.provide(BrowserSocket.layerWebSocket(wsUrl)), Layer.provide(RpcSerialization.layerNdjson))

export const AllRpcs = MessageRpcs.merge(
	NotificationRpcs,
	InvitationRpcs,
	ChannelRpcs,
	ChannelMemberRpcs,
	OrganizationRpcs,
	OrganizationMemberRpcs,
	UserRpcs,
	MessageReactionRpcs,
	TypingIndicatorRpcs,
	PinnedMessageRpcs,
	AttachmentRpcs,
	DirectMessageParticipantRpcs,
	UserPresenceStatusRpcs,
)

export class RpcClient extends Effect.Service<RpcClient>()("RpcClient", {
	scoped: RpcClientBuilder.make(AllRpcs),
	dependencies: [RpcProtocolLive, AuthMiddlewareClientLive],
}) {}
