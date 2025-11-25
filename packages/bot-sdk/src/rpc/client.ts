/**
 * Bot RPC Client Service
 *
 * Provides WebSocket-based RPC client for bots to interact with the Hazel backend.
 * Uses BunSocket for WebSocket transport and NDJSON serialization.
 */

import * as BunSocket from "@effect/platform-bun/BunSocket"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import {
	ChannelRpcs,
	MessageReactionRpcs,
	MessageRpcs,
	TypingIndicatorRpcs,
} from "@hazel/domain/rpc"
import { Context, Effect, Layer } from "effect"
import { createBotAuthMiddleware } from "./auth-middleware.ts"

/**
 * Merged RPC groups that bots can use
 * Includes: Messages, Channels, Reactions, Typing indicators
 */
export const BotRpcs = MessageRpcs.merge(ChannelRpcs, MessageReactionRpcs, TypingIndicatorRpcs)

/**
 * Configuration for creating the bot RPC client
 */
export interface BotRpcClientConfig {
	/**
	 * Backend URL for WebSocket connection
	 * @example "https://api.hazel.sh" or "http://localhost:3003"
	 */
	readonly backendUrl: string

	/**
	 * Bot authentication token
	 */
	readonly botToken: string
}

/**
 * Internal context tag for the RPC client configuration
 */
export class BotRpcClientConfigTag extends Context.Tag("@hazel/bot-sdk/BotRpcClientConfig")<
	BotRpcClientConfigTag,
	BotRpcClientConfig
>() {}

/**
 * Context tag for the RPC client instance
 * Type is inferred from the actual RpcClient.make result
 */
export class BotRpcClient extends Context.Tag("@hazel/bot-sdk/BotRpcClient")<
	BotRpcClient,
	Effect.Effect.Success<ReturnType<typeof makeBotRpcClient>>
>() {}

/**
 * Create a scoped layer that provides the RPC client
 */
export const BotRpcClientLive = Layer.scoped(
	BotRpcClient,
	Effect.gen(function* () {
		const config = yield* BotRpcClientConfigTag
		return yield* makeBotRpcClient(config)
	}),
)

/**
 * Creates an Effect that yields the RPC client for bot operations
 * Types are inferred naturally from RpcClient.make
 *
 * @param config - Client configuration (backendUrl, botToken)
 * @returns Effect that creates the RPC client
 */
export const makeBotRpcClient = (config: BotRpcClientConfig) => {
	const wsUrl = `${config.backendUrl.replace(/^http/, "ws")}/rpc`

	// Create protocol layer with proper layer composition
	const ProtocolLayer = RpcClient.layerProtocolSocket({
		retryTransientErrors: true,
	}).pipe(
		Layer.provide(
			Layer.mergeAll(BunSocket.layerWebSocket(wsUrl), RpcSerialization.layerNdjson),
		),
	)

	const AuthMiddlewareLayer = createBotAuthMiddleware(config.botToken)

	return RpcClient.make(BotRpcs).pipe(
		Effect.provide(Layer.mergeAll(ProtocolLayer, AuthMiddlewareLayer)),
	)
}
