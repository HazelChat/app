import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import type { FunctionReturnType } from "convex/server"
import { useNextPrevPaginatedQuery } from "convex-use-next-prev-paginated-query"
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react"

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
	sendMessage: (props: { content: string; attachments?: string[]; jsonContent: any }) => void
	editMessage: (messageId: Id<"messages">, content: string, jsonContent: any) => Promise<void>
	deleteMessage: (messageId: Id<"messages">) => void
	addReaction: (messageId: Id<"messages">, emoji: string) => void
	removeReaction: (messageId: Id<"messages">, emoji: string) => void
	pinMessage: (messageId: Id<"messages">) => void
	unpinMessage: (messageId: Id<"messages">) => void
	startTyping: () => void
	stopTyping: () => void
	typingUsers: TypingUsers
	createThread: (messageId: Id<"messages">) => void
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

	// Reply state
	const [replyToMessageId, setReplyToMessageId] = useState<Id<"messages"> | null>(null)

	// Keep track of previous messages to show during loading
	const previousMessagesRef = useRef<Message[]>([])
	// Keep track of the channel ID to clear messages when switching channels
	const previousChannelIdRef = useRef<Id<"channels"> | null>(null)
	// Keep track of pagination functions to avoid losing them during loading
	const loadNextRef = useRef<(() => void) | undefined>(undefined)
	const loadPrevRef = useRef<(() => void) | undefined>(undefined)

	// Clear previous messages when channel changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: We only want to run this when channelId changes
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

	const channelQuery = useQuery(
		convexQuery(api.channels.getChannel, { channelId, organizationId }),
	)

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
		convexQuery(
			api.pinnedMessages.getPinnedMessages,
			{ channelId, organizationId },
		),
	)

	// Fetch typing users
	const typingUsersQuery = useQuery(
		convexQuery(api.typingIndicator.list, { channelId, organizationId }),
	)
	const typingUsers: TypingUsers = typingUsersQuery.data || []

	// Debug: Log typing users updates
	if (typingUsers.length > 0) {
		console.log("[DEBUG] Typing users in channel:", typingUsers.map((u) => u.user.firstName).join(", "))
	}

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

	// Message operations
	const sendMessage = ({
		content,
		attachments,
		jsonContent,
	}: {
		content: string
		attachments?: string[]
		jsonContent: any
	}) => {
		sendMessageMutation({
			channelId,
			organizationId,
			content,
			jsonContent,
			attachedFiles: attachments || [],
			replyToMessageId: replyToMessageId || undefined,
		})
		// Clear reply state after sending
		setReplyToMessageId(null)
	}

	const editMessage = async (messageId: Id<"messages">, content: string, jsonContent: any) => {
		await editMessageMutation({
			organizationId,
			id: messageId,
			content,
			jsonContent,
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
		console.log("[DEBUG] Current user started typing in channel:", channelId)
		updateTypingMutation({
			organizationId,
			channelId,
		})
	}

	const stopTyping = () => {
		console.log("[DEBUG] Current user stopped typing in channel:", channelId)
		stopTypingMutation({
			organizationId,
			channelId,
		})
	}

	const createThread = (messageId: Id<"messages">) => {
		// TODO: Implement thread creation
		console.log("Creating thread for message:", messageId)
	}

	// Extract messages and pagination functions based on result state
	const currentMessages = messagesResult._tag === "Loaded" ? messagesResult.page : []

	// Update previous messages when we have new data
	if (currentMessages.length > 0) {
		previousMessagesRef.current = currentMessages
	}

	// Use previous messages during loading states to prevent flashing
	const messages = currentMessages.length > 0 ? currentMessages : previousMessagesRef.current

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
			replyToMessageId,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
