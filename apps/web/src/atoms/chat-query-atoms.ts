import { Atom } from "@effect-atom/atom-react"
import { makeQuery } from "@hazel/tanstack-db-atom"
import type { ChannelId } from "@hazel/db/schema"
import { eq } from "@tanstack/db"
import { channelCollection, messageCollection, pinnedMessageCollection } from "~/db/collections"

/**
 * Atom family for fetching a channel by ID
 * Returns the channel as an array (matching TanStack DB query results)
 */
export const channelByIdAtomFamily = Atom.family((channelId: ChannelId) =>
	makeQuery((q) =>
		q
			.from({ channel: channelCollection })
			.where(({ channel }) => eq(channel.id, channelId))
			.orderBy(({ channel }) => channel.createdAt, "desc")
			.limit(1),
	),
)

/**
 * Atom family for fetching messages by channel ID
 * Includes a left join with pinned messages to show pinned status
 * Returns messages ordered by creation date (most recent first)
 */
export const messagesByChannelAtomFamily = Atom.family((channelId: ChannelId) =>
	makeQuery((q) =>
		q
			.from({ message: messageCollection })
			.leftJoin({ pinned: pinnedMessageCollection }, ({ message, pinned }) =>
				eq(message.id, pinned.messageId),
			)
			.where(({ message }) => eq(message.channelId, channelId))
			.select(({ message, pinned }) => ({
				...message,
				pinnedMessage: pinned,
			}))
			.orderBy(({ message }) => message.createdAt, "desc")
			.limit(50), // TODO: Implement proper pagination
	),
)
