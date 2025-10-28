import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"

/**
 * Mutation atom for creating/updating typing indicators
 * Use with useAtomSet in React components
 */
export const upsertTypingIndicatorMutation = HazelRpcClient.mutation("typingIndicator.create")

/**
 * Mutation atom for deleting typing indicators
 * Use with useAtomSet in React components
 */
export const deleteTypingIndicatorMutation = HazelRpcClient.mutation("typingIndicator.delete")
