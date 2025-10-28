import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"

/**
 * Mutation atom for creating public/private channels
 */
export const createChannelMutation = HazelRpcClient.mutation("channel.create")

/**
 * Mutation atom for creating DM/group channels
 */
export const createDmChannelMutation = HazelRpcClient.mutation("channel.createDm")

/**
 * Mutation atom for updating channels
 */
export const updateChannelMutation = HazelRpcClient.mutation("channel.update")

/**
 * Mutation atom for deleting channels
 */
export const deleteChannelMutation = HazelRpcClient.mutation("channel.delete")
