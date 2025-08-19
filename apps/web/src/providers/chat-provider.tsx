import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@workos-inc/authkit-react"
import type { FunctionReturnType } from "convex/server"
import { useNextPrevPaginatedQuery } from "convex-use-next-prev-paginated-query"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useNotificationSound } from "~/hooks/use-notification-sound"

type MessagesResponse = FunctionReturnType<typeof api.messages.getMessages>
type Message = MessagesResponse["page"][0]
type Channel = FunctionReturnType<typeof api.channels.getChannel>
type PinnedMessage = FunctionReturnType<typeof api.pinnedMessages.getPinnedMessages>[0]
type TypingUser = FunctionReturnType<typeof api.typingIndicator.list>[0]
type TypingUsers = TypingUser[]

interface ChatContextValue {
	channelId: Id<"channels">
	organizationId: Id<"organizations">
	channel: Channel | undefined
	messages: Message[]
	pinnedMessages: PinnedMessage[] | undefined
	loadNext: (() => void) | undefined
	loadPrev: (() => void) | undefined
	isLoadingMessages: boolean
	isLoadingNext: boolean
	isLoadingPrev: boolean
	sendMessage: (props: { content: string; attachments?: Id<"attachments">[] }) => void
	editMessage: (messageId: Id<"messages">, content: string) => Promise<void>
	deleteMessage: (messageId: Id<"messages">) => void
	addReaction: (messageId: Id<"messages">, emoji: string) => void
	removeReaction: (messageId: Id<"messages">, emoji: string) => void
	pinMessage: (messageId: Id<"messages">) => void
	unpinMessage: (messageId: Id<"messages">) => void
	startTyping: () => void
	stopTyping: () => void
	typingUsers: TypingUsers
	createThread: (messageId: Id<"messages">) => Promise<void>
	openThread: (threadChannelId: Id<"channels">, originalMessageId: Id<"messages">) => void
	closeThread: () => void
	activeThreadChannelId: Id<"channels"> | null
	activeThreadMessageId: Id<"messages"> | null
	replyToMessageId: Id<"messages"> | null
	setReplyToMessageId: (messageId: Id<"messages"> | null) => void
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
	channelId: Id<"channels">
	organizationId: Id<"organizations">
	children: ReactNode
}

export function ChatProvider({ channelId, organizationId, children }: ChatProviderProps) {
	const { user } = useAuth()
	const { playSound } = useNotificationSound()

	// Reply state
	const [replyToMessageId, setReplyToMessageId] = useState<Id<"messages"> | null>(null)
	// Thread state
	const [activeThreadChannelId, setActiveThreadChannelId] = useState<Id<"channels"> | null>(null)
	const [activeThreadMessageId, setActiveThreadMessageId] = useState<Id<"messages"> | null>(null)

	// Keep track of previous messages to show during loading
	const previousMessagesRef = useRef<Message[]>([])
	// Keep track of the channel ID to clear messages when switching channels
	const previousChannelIdRef = useRef<Id<"channels"> | null>(null)
	// Keep track of pagination functions to avoid losing them during loading
	const loadNextRef = useRef<(() => void) | undefined>(undefined)
	const loadPrevRef = useRef<(() => void) | undefined>(undefined)
	// Track message count to detect new messages
	const prevMessageCountRef = useRef<number>(0)

	// Clear previous messages when channel changes
	useEffect(() => {
		if (previousChannelIdRef.current && previousChannelIdRef.current !== channelId) {
			// Channel has changed, clear previous messages to prevent stale data
			previousMessagesRef.current = []
			loadNextRef.current = undefined
			loadPrevRef.current = undefined
			setReplyToMessageId(null)
		}
		previousChannelIdRef.current = channelId
	}, [channelId])

	const channelQuery = useQuery(convexQuery(api.channels.getChannel, { channelId, organizationId }))

	const messagesResult = useNextPrevPaginatedQuery(
		api.messages.getMessages,
		{
			channelId,
			organizationId,
		},
		{ initialNumItems: 50 },
	)

	// Fetch pinned messages
	const pinnedMessagesQuery = useQuery(
		convexQuery(api.pinnedMessages.getPinnedMessages, { channelId, organizationId }),
	)

	// Fetch typing users
	const typingUsersQuery = useQuery(convexQuery(api.typingIndicator.list, { channelId, organizationId }))
	const typingUsers: TypingUsers = typingUsersQuery.data || []

	// Mutations
	const sendMessageMutation = useConvexMutation(api.messages.createMessage)
	const editMessageMutation = useConvexMutation(api.messages.updateMessage)
	const deleteMessageMutation = useConvexMutation(api.messages.deleteMessage)
	const addReactionMutation = useConvexMutation(api.messages.createReaction)
	const removeReactionMutation = useConvexMutation(api.messages.deleteReaction)
	const pinMessageMutation = useConvexMutation(api.pinnedMessages.createPinnedMessage)
	const unpinMessageMutation = useConvexMutation(api.pinnedMessages.deletePinnedMessage)
	const updateTypingMutation = useConvexMutation(api.typingIndicator.update)
	const stopTypingMutation = useConvexMutation(api.typingIndicator.stop)
	const createChannelMutation = useConvexMutation(api.channels.createChannel)

	// Message operations
	const sendMessage = ({
		content,
		attachments,
	}: {
		content: string
		attachments?: Id<"attachments">[]
	}) => {
		sendMessageMutation({
			channelId,
			organizationId,
			content,
			attachedFiles: attachments || [],
			replyToMessageId: replyToMessageId || undefined,
		})
		// Clear reply state after sending
		setReplyToMessageId(null)
	}

	const editMessage = async (messageId: Id<"messages">, content: string) => {
		await editMessageMutation({
			organizationId,
			id: messageId,
			content,
		})
	}

	const deleteMessage = (messageId: Id<"messages">) => {
		deleteMessageMutation({
			organizationId,
			id: messageId,
		})
	}

	const addReaction = (messageId: Id<"messages">, emoji: string) => {
		addReactionMutation({
			organizationId,
			messageId,
			emoji,
		})
	}

	const removeReaction = (messageId: Id<"messages">, emoji: string) => {
		removeReactionMutation({
			organizationId,
			id: messageId,
			emoji,
		})
	}

	const pinMessage = (messageId: Id<"messages">) => {
		pinMessageMutation({
			organizationId,
			messageId,
			channelId,
		})
	}

	const unpinMessage = (messageId: Id<"messages">) => {
		unpinMessageMutation({
			organizationId,
			messageId,
			channelId,
		})
	}

	const startTyping = () => {
		updateTypingMutation({
			organizationId,
			channelId,
		})
	}

	const stopTyping = () => {
		stopTypingMutation({
			organizationId,
			channelId,
		})
	}

	const createThread = async (messageId: Id<"messages">) => {
		// Find the message to create thread for
		const message = messages.find((m) => m._id === messageId)
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
			const threadChannelId = await createChannelMutation({
				organizationId,
				name: "Thread",
				type: "thread" as const,
				parentChannelId: channelId,
				threadMessageId: messageId,
			})

			// Open the newly created thread
			setActiveThreadChannelId(threadChannelId)
			setActiveThreadMessageId(messageId)
		}
	}

	const openThread = (threadChannelId: Id<"channels">, originalMessageId: Id<"messages">) => {
		setActiveThreadChannelId(threadChannelId)
		setActiveThreadMessageId(originalMessageId)
	}

	const closeThread = () => {
		setActiveThreadChannelId(null)
		setActiveThreadMessageId(null)
	}

	// Extract messages and pagination functions based on result state
	const currentMessages = messagesResult._tag === "Loaded" ? messagesResult.page : []

	// Update previous messages when we have new data
	if (currentMessages.length > 0) {
		previousMessagesRef.current = currentMessages
	}

	// Use previous messages during loading states to prevent flashing
	const messages = currentMessages.length > 0 ? currentMessages : previousMessagesRef.current

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
			const hasOtherUserMessages = newMessages.some(
				(msg) => msg.author?.email && msg.author.email !== user?.email,
			)

			// Only play sound if window is not focused to avoid duplicate with NotificationManager
			if (hasOtherUserMessages && document.hidden) {
				playSound()
			}
		}

		prevMessageCountRef.current = messages.length
	}, [messages.length, channelId, user?.email, playSound, messages.slice])

	// Update pagination function refs when available
	if (messagesResult._tag === "Loaded") {
		loadNextRef.current = messagesResult.loadNext ?? undefined
		loadPrevRef.current = messagesResult.loadPrev ?? undefined
	}

	// Use stored functions during loading states
	const loadNext = loadNextRef.current
	const loadPrev = loadPrevRef.current
	const isLoadingMessages = messagesResult._tag === "LoadingInitialResults"
	const isLoadingNext = messagesResult._tag === "LoadingNextResults"
	const isLoadingPrev = messagesResult._tag === "LoadingPrevResults"

	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependencies are correctly managed
	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			organizationId,
			channel: channelQuery.data,
			messages,
			pinnedMessages: pinnedMessagesQuery.data,
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
			startTyping,
			stopTyping,
			typingUsers,
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
			channelQuery.data,
			messages,
			pinnedMessagesQuery.data,
			loadNext,
			loadPrev,
			isLoadingMessages,
			isLoadingNext,
			isLoadingPrev,
			typingUsers,
			organizationId,
			activeThreadChannelId,
			activeThreadMessageId,
			replyToMessageId,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
