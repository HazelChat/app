import type { ChannelId, ChannelWebhookId, OrganizationId, UserId } from "@hazel/schema"
import { HazelRpcClient } from "~/lib/services/common/rpc-atom-client"

/**
 * Type for webhook data returned from RPC (without sensitive tokenHash field).
 * Use this type for frontend components that display webhook information.
 */
export interface WebhookData {
	id: ChannelWebhookId
	channelId: ChannelId
	organizationId: OrganizationId
	botUserId: UserId
	name: string
	description: string | null
	avatarUrl: string | null
	tokenSuffix: string
	isEnabled: boolean
	createdBy: UserId
	lastUsedAt: Date | null
	createdAt: Date
	updatedAt: Date | null
	deletedAt: Date | null
}

/**
 * Mutation atom for creating a channel webhook.
 * Returns the webhook data including the plain token (only shown once).
 */
export const createChannelWebhookMutation = HazelRpcClient.mutation("channelWebhook.create")

/**
 * Mutation atom for listing all webhooks for a channel.
 */
export const listChannelWebhooksMutation = HazelRpcClient.mutation("channelWebhook.list")

/**
 * Mutation atom for updating webhook configuration.
 * Can update name, description, avatar URL, and enabled status.
 */
export const updateChannelWebhookMutation = HazelRpcClient.mutation("channelWebhook.update")

/**
 * Mutation atom for regenerating a webhook token.
 * The old token is invalidated immediately.
 * Returns the new token (only shown once).
 */
export const regenerateChannelWebhookTokenMutation = HazelRpcClient.mutation("channelWebhook.regenerateToken")

/**
 * Mutation atom for deleting a webhook (soft delete).
 */
export const deleteChannelWebhookMutation = HazelRpcClient.mutation("channelWebhook.delete")
