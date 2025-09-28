import type { Channel, Message } from "@hazel/db/models"
import {
	type AttachmentId,
	ChannelId,
	type MessageId,
	MessageReactionId,
	type OrganizationId,
	PinnedMessageId,
	UserId,
} from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react"
import { v4 as uuid } from "uuid"
import { sendMessage as sendMessageAction } from "~/db/actions"
import {
	channelCollection,
	messageCollection,
	messageReactionCollection,
	pinnedMessageCollection,
} from "~/db/collections"
import { useNotificationSound } from "~/hooks/use-notification-sound"
import { useAuth } from "~/providers/auth-provider"

interface ChatContextValue {
	channelId: ChannelId
	organizationId: OrganizationId
	channel: typeof Channel.Model.Type | undefined
	messages: (typeof Message.Model.Type)[]
	loadNext: (() => void) | undefined
	loadPrev: (() => void) | undefined
	isLoadingMessages: boolean
	isLoadingNext: boolean
	isLoadingPrev: boolean
	sendMessage: (props: { content: string; attachments?: AttachmentId[] }) => void
	editMessage: (messageId: MessageId, content: string) => Promise<void>
	deleteMessage: (messageId: MessageId) => void
	addReaction: (messageId: MessageId, emoji: string) => void
	removeReaction: (reactionId: MessageReactionId) => void
	pinMessage: (messageId: MessageId) => void
	unpinMessage: (messageId: MessageId) => void
	createThread: (messageId: MessageId) => Promise<void>
	openThread: (threadChannelId: ChannelId, originalMessageId: MessageId) => void
	closeThread: () => void
	activeThreadChannelId: ChannelId | null
	activeThreadMessageId: MessageId | null
	replyToMessageId: MessageId | null
	setReplyToMessageId: (messageId: MessageId | null) => void
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function useChat() {
	const context = useContext(ChatContext)
	if (!context) {
		throw new Error("useChat must be used within a ChatProvider")
	}
	return context
}

interface ChatProviderProps {
	channelId: ChannelId
	organizationId: OrganizationId
	children: ReactNode
}

export function ChatProvider({ channelId, organizationId, children }: ChatProviderProps) {
	const { user } = useAuth()
	const { playSound } = useNotificationSound()

	// Reply state
	const [replyToMessageId, setReplyToMessageId] = useState<MessageId | null>(null)
	// Thread state
	const [activeThreadChannelId, setActiveThreadChannelId] = useState<ChannelId | null>(null)
	const [activeThreadMessageId, setActiveThreadMessageId] = useState<MessageId | null>(null)

	const previousMessagesRef = useRef<(typeof Message.Model.Type)[]>([])
	const previousChannelIdRef = useRef<ChannelId | null>(null)
	const loadNextRef = useRef<(() => void) | undefined>(undefined)
	const loadPrevRef = useRef<(() => void) | undefined>(undefined)
	const prevMessageCountRef = useRef<number>(0)

	useEffect(() => {
		if (previousChannelIdRef.current && previousChannelIdRef.current !== channelId) {
			previousMessagesRef.current = []
			loadNextRef.current = undefined
			loadPrevRef.current = undefined
			setReplyToMessageId(null)
		}
		previousChannelIdRef.current = channelId
	}, [channelId])

	const { data: channelData } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.where(({ channel }) => eq(channel.id, channelId))
				.orderBy(({ channel }) => channel.createdAt, "desc")
				.limit(1),
		[channelId],
	)

	const channel = channelData?.[0]

	// Fetch messages from TanStack DB (TODO: Add pagination)
	const { data: messagesData, isLoading: messagesLoading } = useLiveQuery(
		(q) =>
			q
				.from({ message: messageCollection })
				.where(({ message }) => eq(message.channelId, channelId))
				.orderBy(({ message }) => message.createdAt, "desc")
				.limit(50), // TODO: Implement proper pagination
		[channelId],
	)



	// Message operations
	const sendMessage = ({ content, attachments }: { content: string; attachments?: AttachmentId[] }) => {
		if (!user?.id) return

		// Use the sendMessage action which handles both message creation and attachment linking
		sendMessageAction({
			channelId,
			authorId: UserId.make(user.id),
			content,
			replyToMessageId,
			threadChannelId: null,
			attachmentIds: attachments as AttachmentId[] | undefined,
		})

		// Clear reply state after sending
		setReplyToMessageId(null)
	}

	const editMessage = async (messageId: MessageId, content: string) => {
		messageCollection.update(messageId, (message) => {
			message.content = content
			message.updatedAt = new Date()
		})
	}

	const deleteMessage = (messageId: MessageId) => {
		messageCollection.delete(messageId)
	}

	const addReaction = (messageId: MessageId, emoji: string) => {
		if (!user?.id) return

		messageReactionCollection.insert({
			id: MessageReactionId.make(uuid()),
			messageId,
			userId: UserId.make(user.id),
			emoji,
			createdAt: new Date(),
		})
	}

	const removeReaction = (reactionId: MessageReactionId) => {
		if (!user?.id) return

		messageReactionCollection.delete(reactionId)
	}

	const pinMessage = (messageId: MessageId) => {
		if (!user?.id) return

		pinnedMessageCollection.insert({
			id: PinnedMessageId.make(uuid()),
			channelId,
			messageId,
			pinnedBy: UserId.make(user.id),
			pinnedAt: new Date(),
		})
	}

	const unpinMessage = (_messageId: MessageId) => {
		// Find the pinned message record to delete
		// Note: This would ideally use a proper query to find the pinned message ID
		// For now, we'll need to implement this based on how pinned messages are stored
		// TODO: Add proper pinned message lookup logic
		console.log("unpinMessage not fully implemented - need pinned message ID lookup")
	}

	const createThread = async (messageId: MessageId) => {
		// Find the message to create thread for
		const message = messages.find((m) => m.id === messageId)
		if (!message) {
			console.error("Message not found for thread creation")
			return
		}

		// Check if thread already exists
		if (message.threadChannelId) {
			// Open existing thread
			setActiveThreadChannelId(message.threadChannelId)
			setActiveThreadMessageId(messageId)
		} else {
			// Create new thread channel
			const threadChannelId = ChannelId.make(uuid())
			channelCollection.insert({
				id: threadChannelId,
				organizationId,
				name: "Thread",
				type: "thread" as const,
				parentChannelId: channelId,
				createdAt: new Date(),
				updatedAt: null,
				deletedAt: null,
			})

			// Open the newly created thread
			setActiveThreadChannelId(threadChannelId)
			setActiveThreadMessageId(messageId)
		}
	}

	const openThread = (threadChannelId: ChannelId, originalMessageId: MessageId) => {
		setActiveThreadChannelId(threadChannelId)
		setActiveThreadMessageId(originalMessageId)
	}

	const closeThread = () => {
		setActiveThreadChannelId(null)
		setActiveThreadMessageId(null)
	}

	// Update previous messages when we have new data
	if (messagesData.length > 0) {
		previousMessagesRef.current = messagesData
	}

	// Use previous messages during loading states to prevent flashing
	const messages = messagesData.length > 0 ? messagesData : previousMessagesRef.current

	// Play sound when new messages arrive from other users (only when window is not focused)
	useEffect(() => {
		// Skip on first render or when switching channels
		if (prevMessageCountRef.current === 0 || previousChannelIdRef.current !== channelId) {
			prevMessageCountRef.current = messages.length
			return
		}

		// Check if we have new messages
		if (messages.length > prevMessageCountRef.current) {
			// Get the new messages
			const newMessagesCount = messages.length - prevMessageCountRef.current
			const newMessages = messages.slice(0, newMessagesCount)

			// Check if any of the new messages are from other users
			// TODO: Join with users to get author info
			const hasOtherUserMessages = newMessages.some((msg) => msg.authorId !== user?.id)

			// Only play sound if window is not focused to avoid duplicate with NotificationManager
			if (hasOtherUserMessages && document.hidden) {
				playSound()
			}
		}

		prevMessageCountRef.current = messages.length
	}, [messages.length, channelId, user?.id, playSound, messages])

	// TODO: Implement pagination for TanStack DB
	// For now, set these to undefined/false
	const loadNext = undefined
	const loadPrev = undefined
	const isLoadingMessages = messagesLoading
	const isLoadingNext = false
	const isLoadingPrev = false

	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependencies are correctly managed
	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			organizationId,
			channel,
			messages,
			loadNext,
			loadPrev,
			isLoadingMessages,
			isLoadingNext,
			isLoadingPrev,
			sendMessage,
			editMessage,
			deleteMessage,
			addReaction,
			removeReaction,
			pinMessage,
			unpinMessage,
			createThread,
			openThread,
			closeThread,
			activeThreadChannelId,
			activeThreadMessageId,
			replyToMessageId,
			setReplyToMessageId,
		}),
		[
			channelId,
			channel,
			messages,
			loadNext,
			loadPrev,
			isLoadingMessages,
			isLoadingNext,
			isLoadingPrev,
			organizationId,
			activeThreadChannelId,
			activeThreadMessageId,
			replyToMessageId,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
