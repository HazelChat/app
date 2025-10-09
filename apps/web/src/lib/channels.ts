import type { Channel } from "@hazel/db/models"
import { createLiveQueryCollection, eq } from "@tanstack/react-db"
import { channelCollection, channelMemberCollection } from "~/db/collections"

/**
 * Live query collection for all single DM channels with their members.
 * This collection is reactive and updates automatically when channels or members change.
 */
export const singleDmChannelsCollection = createLiveQueryCollection({
	startSync: true,
	query: (q) =>
		q
			.from({ channel: channelCollection })
			.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
				eq(member.channelId, channel.id),
			)
			.where(({ channel }) => eq(channel.type, "single")),
})

/**
 * Finds an existing single DM channel between two users.
 *
 * @param currentUserId - The current user's ID
 * @param targetUserId - The target user's ID
 * @returns The channel if found, otherwise null
 */
export function findExistingDmChannel(
	currentUserId: string,
	targetUserId: string,
): typeof Channel.Model.Type | null {
	const channels = singleDmChannelsCollection.toArray

	if (!channels || channels.length === 0) return null

	// Group channels by channel ID
	const channelGroups = new Map<string, string[]>()
	for (const item of channels) {
		if (!channelGroups.has(item.channel.id)) {
			channelGroups.set(item.channel.id, [])
		}
		channelGroups.get(item.channel.id)!.push(item.member.userId)
	}

	// Find a channel with exactly these two users
	for (const [channelId, memberIds] of channelGroups.entries()) {
		if (memberIds.length === 2 && memberIds.includes(currentUserId) && memberIds.includes(targetUserId)) {
			return channels.find((item) => item.channel.id === channelId)?.channel ?? null
		}
	}

	return null
}
