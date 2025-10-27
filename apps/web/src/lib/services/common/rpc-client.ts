import { HttpClient } from "@effect/platform"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
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
 * Custom Fetch Layer with Credentials
 *
 * Configures the fetch client to include credentials (cookies) with all requests.
 * This is required for the WorkOS session cookie to be sent to the backend.
 */
export const CustomFetchLive = FetchHttpClient.layer.pipe(
	Layer.provide(
		Layer.succeed(FetchHttpClient.RequestInit, {
			credentials: "include",
		}),
	),
)

export const RpcProtocolLive = RpcClientBuilder.layerProtocolHttp({
	url: `${import.meta.env.VITE_BACKEND_URL}/rpc`,
}).pipe(Layer.provide(CustomFetchLive), Layer.provide(RpcSerialization.layerNdjson))

const AllRpcs = MessageRpcs.merge(
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
