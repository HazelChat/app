import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import type { FunctionReturnType } from "convex/server"
import { createContext, type ReactNode, useContext, useMemo, useState } from "react"
import { useNextPrevPaginatedQuery } from "convex-use-next-prev-paginated-query"

type MessagesResponse = FunctionReturnType<typeof api.messages.getMessages>
type Message = MessagesResponse["page"][0]
type Channel = FunctionReturnType<typeof api.channels.getChannel>
interface TypingUser {
	userId: string
	user: {
		firstName: string
		lastName: string
	}
}
type TypingUsers = TypingUser[]

interface ChatContextValue {
	channelId: Id<"channels">
	channel: Channel | undefined
	messages: Message[]
	loadMoreMessages: () => void
	loadNewerMessages: () => void
	hasMoreMessages: boolean
	hasNewerMessages: boolean
	isLoadingMessages: boolean
	sendMessage: (props: { content: string; attachments?: string[]; jsonContent: any }) => void
	editMessage: (messageId: Id<"messages">, content: string, jsonContent: any) => Promise<void>
	deleteMessage: (messageId: Id<"messages">) => void
	addReaction: (messageId: Id<"messages">, emoji: string) => void
	removeReaction: (messageId: Id<"messages">, emoji: string) => void
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
	children: ReactNode
}

export function ChatProvider({ channelId, children }: ChatProviderProps) {
	// Get current organization
	const organizationQuery = useQuery(convexQuery(api.me.getOrganization, {}))
	const organizationId =
		organizationQuery.data?.directive === "success" ? organizationQuery.data.data._id : undefined

	// Reply state
	const [replyToMessageId, setReplyToMessageId] = useState<Id<"messages"> | null>(null)

	// Fetch channel data
	const channelQuery = useQuery(
		convexQuery(api.channels.getChannel, organizationId ? { channelId, organizationId } : "skip"),
	)

	// Fetch messages with pagination
	const messagesResult = useNextPrevPaginatedQuery(
		api.messages.getMessages,
		organizationId ? { channelId, organizationId } : "skip",
		{ initialNumItems: 50 },
	)

	// Fetch typing users - TODO: Implement when API is available
	const typingUsers: TypingUsers = []

	// Mutations
	const sendMessageMutation = useConvexMutation(api.messages.createMessage)
	const editMessageMutation = useConvexMutation(api.messages.updateMessage)
	const deleteMessageMutation = useConvexMutation(api.messages.deleteMessage)
	const addReactionMutation = useConvexMutation(api.messages.createReaction)
	const removeReactionMutation = useConvexMutation(api.messages.deleteReaction)

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
		if (!organizationId) return
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
		if (!organizationId) return
		await editMessageMutation({
			organizationId,
			id: messageId,
			content,
			jsonContent,
		})
	}

	const deleteMessage = (messageId: Id<"messages">) => {
		if (!organizationId) return
		deleteMessageMutation({
			organizationId,
			id: messageId,
		})
	}

	const addReaction = (messageId: Id<"messages">, emoji: string) => {
		if (!organizationId) return
		addReactionMutation({
			organizationId,
			messageId,
			emoji,
		})
	}

	const removeReaction = (messageId: Id<"messages">, emoji: string) => {
		if (!organizationId) return
		removeReactionMutation({
			organizationId,
			id: messageId,
			emoji,
		})
	}

	const startTyping = () => {
		// TODO: Implement when typing API is available
		console.log("Start typing")
	}

	const stopTyping = () => {
		// TODO: Implement when typing API is available
		console.log("Stop typing")
	}

	const createThread = (messageId: Id<"messages">) => {
		// TODO: Implement thread creation
		console.log("Creating thread for message:", messageId)
	}

	const loadMoreMessages = () => {
		if (messagesResult._tag === "Loaded" && messagesResult.loadNext) {
			messagesResult.loadNext()
		}
	}

	const loadNewerMessages = () => {
		if (messagesResult._tag === "Loaded" && messagesResult.loadPrev) {
			messagesResult.loadPrev()
		}
	}

	// Extract messages and loading state from paginated result
	const messages = messagesResult._tag === "Loaded" ? messagesResult.page : []
	const isLoadingMessages =
		messagesResult._tag === "Loading" ||
		messagesResult._tag === "LoadingNextPage" ||
		messagesResult._tag === "LoadingPrevPage"
	const hasMoreMessages = messagesResult._tag === "Loaded" && messagesResult.loadNext !== undefined
	const hasNewerMessages = messagesResult._tag === "Loaded" && messagesResult.loadPrev !== undefined

	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependencies are correctly managed
	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			channel: channelQuery.data,
			messages,
			loadMoreMessages,
			loadNewerMessages,
			hasMoreMessages,
			hasNewerMessages,
			isLoadingMessages,
			sendMessage,
			editMessage,
			deleteMessage,
			addReaction,
			removeReaction,
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
			isLoadingMessages,
			hasMoreMessages,
			hasNewerMessages,
			typingUsers,
			organizationId,
			replyToMessageId,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
