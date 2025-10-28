import { AtomRpc } from "@effect-atom/atom-react"

import { AuthMiddlewareClientLive } from "@hazel/backend/rpc/middleware/client"
import { Layer } from "effect"
import { AllRpcs, RpcProtocolLive } from "./rpc-client"

const AtomRpcProtocolLive = RpcProtocolLive.pipe(Layer.provide(AuthMiddlewareClientLive))

/**
 * Hazel RPC Client for React/Effect-Atom
 *
 * Provides type-safe RPC calls with React integration via Effect-Atom.
 * Uses a dedicated protocol layer that includes authentication middleware.
 *
 * This client is included in the shared runtime (see runtime.ts) and shares
 * the same WebSocket connection as the regular RpcClient, ensuring efficient
 * resource usage with a single WebSocket connection for all RPC calls.
 */
export class HazelRpcClient extends AtomRpc.Tag<HazelRpcClient>()("HazelRpcClient", {
	group: AllRpcs,
	// @ts-expect-error
	protocol: AtomRpcProtocolLive,
}) {}

export type { RpcClientError } from "@effect/rpc"
