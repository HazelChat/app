import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import type { FunctionReturnType } from "convex/server"
import { createContext, type ReactNode, useContext, useMemo } from "react"

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
	hasMoreMessages: boolean
	isLoadingMessages: boolean
	sendMessage: (props: { content: string; attachments?: string[]; jsonContent: any }) => void
	editMessage: (messageId: Id<"messages">, content: string) => void
	deleteMessage: (messageId: Id<"messages">) => void
	addReaction: (messageId: Id<"messages">, emoji: string) => void
	removeReaction: (messageId: Id<"messages">, emoji: string) => void
	startTyping: () => void
	stopTyping: () => void
	typingUsers: TypingUsers
	createThread: (messageId: Id<"messages">) => void
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

	// Fetch channel data
	const channelQuery = useQuery(
		convexQuery(api.channels.getChannel, organizationId ? { channelId, organizationId } : "skip"),
	)

	// Fetch messages with pagination
	const messagesQuery = useQuery(
		convexQuery(
			api.messages.getMessages,
			organizationId
				? {
						channelId,
						organizationId,
						paginationOpts: { numItems: 50, cursor: null },
					}
				: "skip",
		),
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
		})
	}

	const editMessage = (messageId: Id<"messages">, content: string) => {
		if (!organizationId) return
		editMessageMutation({
			organizationId,
			id: messageId,
			content,
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
		// TODO: Implement pagination
		console.log("Loading more messages")
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			channel: channelQuery.data,
			messages: messagesQuery.data?.page || [],
			loadMoreMessages,
			hasMoreMessages: messagesQuery.data?.continueCursor !== undefined,
			isLoadingMessages: messagesQuery.isLoading,
			sendMessage,
			editMessage,
			deleteMessage,
			addReaction,
			removeReaction,
			startTyping,
			stopTyping,
			typingUsers,
			createThread,
		}),
		[
			channelId,
			channelQuery.data,
			messagesQuery.data,
			messagesQuery.isLoading,
			typingUsers,
			organizationId,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
