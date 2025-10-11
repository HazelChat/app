import { Atom, Result } from "@effect-atom/atom-react"
import type { Message, PinnedMessage, User } from "@hazel/db/models"
import type { ChannelId } from "@hazel/db/schema"
import { makeQuery } from "@hazel/tanstack-db-atom"
import { eq } from "@tanstack/db"
import {
	channelCollection,
	messageCollection,
	pinnedMessageCollection,
	userCollection,
} from "~/db/collections"

export type MessageWithPinned = typeof Message.Model.Type & {
	pinnedMessage: typeof PinnedMessage.Model.Type | null | undefined
	author: typeof User.Model.Type | null | undefined
}

export type ProcessedMessage = {
	message: MessageWithPinned
	isGroupStart: boolean
	isGroupEnd: boolean
	isFirstNewMessage: boolean
	isPinned: boolean
}

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
 * Includes left joins with pinned messages and user (author) data
 * Returns messages ordered by creation date (most recent first)
 */
export const messagesByChannelAtomFamily = Atom.family((channelId: ChannelId) =>
	makeQuery(
		(q) =>
			q
				.from({ message: messageCollection })
				.leftJoin({ pinned: pinnedMessageCollection }, ({ message, pinned }) =>
					eq(message.id, pinned.messageId),
				)
				.leftJoin({ author: userCollection }, ({ message, author }) =>
					eq(message.authorId, author.id),
				)
				.where(({ message }) => eq(message.channelId, channelId))
				.select(({ message, pinned, author }) => ({
					...message,
					pinnedMessage: pinned,
					author: author,
				}))
				.orderBy(({ message }) => message.createdAt, "desc")
				.limit(50), // TODO: Implement proper pagination
	),
)

/**
 * Derived atom: Processes raw messages into grouped messages with metadata
 * Automatically recomputes when messages change
 */
export const processedMessagesByChannelAtomFamily = Atom.family((channelId: ChannelId) =>
	Atom.make((get) => {
		// Read from the raw messages atom
		const messagesResult = get(messagesByChannelAtomFamily(channelId))
		const messages = Result.getOrElse(messagesResult, () => [])

		const timeThreshold = 5 * 60 * 1000
		const chronologicalMessages = [...messages].reverse()

		return chronologicalMessages.map((message, index): ProcessedMessage => {
			// Determine isGroupStart
			const prevMessage = index > 0 ? chronologicalMessages[index - 1] : null
			const isGroupStart =
				!prevMessage ||
				message.authorId !== prevMessage.authorId ||
				message.createdAt.getTime() - prevMessage.createdAt.getTime() > timeThreshold ||
				!!prevMessage.replyToMessageId

			// Determine isGroupEnd
			const nextMessage =
				index < chronologicalMessages.length - 1 ? chronologicalMessages[index + 1] : null
			const isGroupEnd =
				!nextMessage ||
				message.authorId !== nextMessage.authorId ||
				nextMessage.createdAt.getTime() - message.createdAt.getTime() > timeThreshold

			const isFirstNewMessage = false
			const isPinned = !!message.pinnedMessage?.id

			return {
				message,
				isGroupStart,
				isGroupEnd,
				isFirstNewMessage,
				isPinned,
			}
		})
	}),
)
