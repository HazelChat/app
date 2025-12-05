import { Reactivity } from "@effect/experimental"
import * as BrowserSocket from "@effect/platform-browser/BrowserSocket"
import { RpcClient as RpcClientBuilder, RpcSerialization } from "@effect/rpc"
import { AtomRpc } from "@effect-atom/atom-react"
import { AuthMiddlewareClientLive } from "@hazel/backend/rpc/middleware/client"
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

const backendUrl = import.meta.env.VITE_BACKEND_URL
const wsUrl = `${backendUrl.replace(/^http/, "ws")}/rpc`

export const RpcProtocolLive = RpcClientBuilder.layerProtocolSocket({
	retryTransientErrors: true,
}).pipe(Layer.provide(BrowserSocket.layerWebSocket(wsUrl)), Layer.provide(RpcSerialization.layerNdjson))

const AtomRpcProtocolLive = RpcProtocolLive.pipe(
	Layer.provide(AuthMiddlewareClientLive),
	Layer.provide(Reactivity.layer),
)

const AllRpcs = MessageRpcs.merge(
	NotificationRpcs,
	InvitationRpcs,
	ChannelRpcs,
	ChannelMemberRpcs,
	ChannelWebhookRpcs,
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
