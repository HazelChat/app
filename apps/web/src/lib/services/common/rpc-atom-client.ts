import { RpcClient as RpcClientBuilder, RpcSerialization } from "@effect/rpc"
import { AtomRpc } from "@effect-atom/atom-react"
import { AttachmentRpcs } from "@hazel/backend/rpc/groups/attachments"
import { ChannelMemberRpcs } from "@hazel/backend/rpc/groups/channel-members"
import { ChannelRpcs } from "@hazel/backend/rpc/groups/channels"
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
import { Layer } from "effect"
import { CustomFetchLive } from "./api-client"

const backendUrl = import.meta.env.VITE_BACKEND_URL
const httpUrl = `${backendUrl}/rpc`

export const RpcProtocolLive = RpcClientBuilder.layerProtocolHttp({
	url: httpUrl,
}).pipe(Layer.provide(CustomFetchLive), Layer.provide(RpcSerialization.layerJson))

const AtomRpcProtocolLive = RpcProtocolLive.pipe(Layer.provide(AuthMiddlewareClientLive))

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
	UserPresenceStatusRpcs,
)

export class HazelRpcClient extends AtomRpc.Tag<HazelRpcClient>()("HazelRpcClient", {
	group: AllRpcs,
	// @ts-expect-error
	protocol: AtomRpcProtocolLive,
}) {}

export type { RpcClientError } from "@effect/rpc"
