import { AtomRpc } from "@effect-atom/atom-react"

import { AuthMiddlewareClientLive } from "@hazel/backend/rpc/middleware/client"
import { Layer } from "effect"
import { AllRpcs, RpcProtocolLive } from "./rpc-client"

/**
 * AtomRpc Protocol Layer
 *
 * AtomRpc requires middleware client layers to be provided in the protocol layer,
 * unlike the regular RpcClient which can have them in service dependencies.
 *
 * This layer combines HTTP transport, NDJSON serialization, and auth middleware.
 */
const AtomRpcProtocolLive = RpcProtocolLive.pipe(Layer.provide(AuthMiddlewareClientLive))

/**
 * Hazel RPC Client for React/Effect-Atom
 *
 * Provides type-safe RPC calls with React integration via Effect-Atom.
 * Uses a dedicated protocol layer that includes authentication middleware.
 */
export class HazelRpcClient extends AtomRpc.Tag<HazelRpcClient>()("HazelRpcClient", {
	group: AllRpcs,
	// @ts-expect-error
	protocol: AtomRpcProtocolLive,
}) {}

/**
 * Re-export RPC error types for convenience
 */
export type { RpcClientError } from "@effect/rpc"
