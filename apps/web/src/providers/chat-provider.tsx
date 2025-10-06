import type { Channel, Message, PinnedMessage } from "@hazel/db/models"
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
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import { sendMessage as sendMessageAction } from "~/db/actions"
import {
	channelCollection,
	messageCollection,
	messageReactionCollection,
	pinnedMessageCollection,
} from "~/db/collections"
import { useNotificationSound } from "~/hooks/use-notification-sound"
import { useAuth } from "~/providers/auth-provider"

type MessageWithPinned = typeof Message.Model.Type & {
	pinnedMessage: typeof PinnedMessage.Model.Type | null | undefined
}

interface ChatContextValue {
	channelId: ChannelId
	organizationId: OrganizationId
	channel: typeof Channel.Model.Type | undefined
	messages: MessageWithPinned[]
	isLoadingMessages: boolean
	sendMessage: (props: { content: string; attachments?: AttachmentId[] }) => void
	editMessage: (messageId: MessageId, content: string) => Promise<void>
	deleteMessage: (messageId: MessageId) => void
	addReaction: (messageId: MessageId, emoji: string) => void
	removeReaction: (reactionId: MessageReactionId) => void
	pinMessage: (messageId: MessageId) => void
	unpinMessage: (pinnedMessageId: PinnedMessageId) => void
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

	const previousMessagesRef = useRef<MessageWithPinned[]>([])
	const previousChannelIdRef = useRef<ChannelId | null>(null)
	const prevMessageCountRef = useRef<number>(0)

	useEffect(() => {
		if (previousChannelIdRef.current && previousChannelIdRef.current !== channelId) {
			previousMessagesRef.current = []
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
		[channelId],
	)

	// Use previous messages during loading states to prevent flashing
	const messages = messagesData.length > 0 ? messagesData : previousMessagesRef.current

	// Update previous messages when we have new data
	useEffect(() => {
		if (messagesData.length > 0) {
			previousMessagesRef.current = messagesData
		}
	}, [messagesData])

	// Message operations
	const sendMessage = useCallback(
		async ({ content, attachments }: { content: string; attachments?: AttachmentId[] }) => {
			if (!user?.id) return

			// Use the sendMessage action which handles both message creation and attachment linking
			const tx = sendMessageAction({
				channelId,
				authorId: UserId.make(user.id),
				content,
				replyToMessageId,
				threadChannelId: null,
				attachmentIds: attachments as AttachmentId[] | undefined,
			})

			await tx.isPersisted.promise

			console.log("tx", tx)

			// Clear reply state after sending
			setReplyToMessageId(null)
		},
		[channelId, user?.id, replyToMessageId],
	)

	const editMessage = useCallback(async (messageId: MessageId, content: string) => {
		messageCollection.update(messageId, (message) => {
			message.content = content
			message.updatedAt = new Date()
		})
	}, [])

	const deleteMessage = useCallback((messageId: MessageId) => {
		messageCollection.delete(messageId)
	}, [])

	const addReaction = useCallback(
		(messageId: MessageId, emoji: string) => {
			if (!user?.id) return

			messageReactionCollection.insert({
				id: MessageReactionId.make(crypto.randomUUID()),
				messageId,
				userId: UserId.make(user.id),
				emoji,
				createdAt: new Date(),
			})
		},
		[user?.id],
	)

	const removeReaction = useCallback(
		(reactionId: MessageReactionId) => {
			if (!user?.id) return

			messageReactionCollection.delete(reactionId)
		},
		[user?.id],
	)

	const pinMessage = useCallback(
		(messageId: MessageId) => {
			if (!user?.id) return

			pinnedMessageCollection.insert({
				id: PinnedMessageId.make(crypto.randomUUID()),
				channelId,
				messageId,
				pinnedBy: UserId.make(user.id),
				pinnedAt: new Date(),
			})
		},
		[channelId, user?.id],
	)

	const unpinMessage = useCallback((pinnedMessageId: PinnedMessageId) => {
		pinnedMessageCollection.delete(pinnedMessageId)
	}, [])

	const createThread = useCallback(
		async (messageId: MessageId) => {
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
				const threadChannelId = ChannelId.make(crypto.randomUUID())
				const tx = channelCollection.insert({
					id: threadChannelId,
					organizationId,
					name: "Thread",
					type: "thread" as const,
					parentChannelId: channelId,
					createdAt: new Date(),
					updatedAt: null,
					deletedAt: null,
				})

				await tx.isPersisted.promise

				// Open the newly created thread
				setActiveThreadChannelId(threadChannelId)
				setActiveThreadMessageId(messageId)
			}
		},
		[messages, channelId, organizationId],
	)

	const openThread = useCallback((threadChannelId: ChannelId, originalMessageId: MessageId) => {
		setActiveThreadChannelId(threadChannelId)
		setActiveThreadMessageId(originalMessageId)
	}, [])

	const closeThread = useCallback(() => {
		setActiveThreadChannelId(null)
		setActiveThreadMessageId(null)
	}, [])

	// Play sound when new messages arrive from other users (only when window is not focused)
	// biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally only depend on length changes, not the full array
	useEffect(() => {
		// Skip on first render or when switching channels
		if (prevMessageCountRef.current === 0 || previousChannelIdRef.current !== channelId) {
			prevMessageCountRef.current = messagesData.length
			return
		}

		// Check if we have new messages
		if (messagesData.length > prevMessageCountRef.current) {
			// Get the new messages
			const newMessagesCount = messagesData.length - prevMessageCountRef.current
			const newMessages = messagesData.slice(0, newMessagesCount)

			// Check if any of the new messages are from other users
			// TODO: Join with users to get author info
			const hasOtherUserMessages = newMessages.some((msg) => msg.authorId !== user?.id)

			// Only play sound if window is not focused to avoid duplicate with NotificationManager
			if (hasOtherUserMessages && document.hidden) {
				playSound()
			}
		}

		prevMessageCountRef.current = messagesData.length
	}, [messagesData.length, channelId, user?.id, playSound])

	// TODO: Implement pagination for TanStack DB
	const isLoadingMessages = messagesLoading

	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			organizationId,
			channel,
			messages,
			isLoadingMessages,
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
			organizationId,
			channel,
			messages,
			isLoadingMessages,
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
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
