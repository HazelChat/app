import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { FunctionReturnType } from "convex/server"
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react"

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
	isLoadingMore: boolean
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

	// Pagination state
	const [allMessages, setAllMessages] = useState<Message[]>([])
	const [nextCursor, setNextCursor] = useState<string | null>(null)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const queryClient = useQueryClient()

	// Fetch channel data
	const channelQuery = useQuery(
		convexQuery(api.channels.getChannel, organizationId ? { channelId, organizationId } : "skip"),
	)

	// Fetch initial messages
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

	// Update messages when initial data loads
	useMemo(() => {
		if (messagesQuery.data) {
			setAllMessages(messagesQuery.data.page)
			setNextCursor(messagesQuery.data.continueCursor || null)
		}
	}, [messagesQuery.data])

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

	const loadMoreMessages = useCallback(async () => {
		if (!organizationId || !nextCursor || isLoadingMore) return

		setIsLoadingMore(true)

		try {
			// Create the convex query configuration
			const query = convexQuery(api.messages.getMessages, {
				channelId,
				organizationId,
				paginationOpts: { numItems: 50, cursor: nextCursor },
			})

			// Fetch using the query configuration
			const data = await queryClient.fetchQuery({
				queryKey: query.queryKey,
				queryFn: query.queryFn,
			})

			if (data?.page) {
				setAllMessages((prev) => [...prev, ...data.page])
				setNextCursor(data.continueCursor || null)
			}
		} catch (error) {
			console.error("Failed to load more messages:", error)
		} finally {
			setIsLoadingMore(false)
		}
	}, [organizationId, nextCursor, isLoadingMore, channelId, queryClient])

	const hasMoreMessages = nextCursor !== null
	const isLoadingMessages = messagesQuery.isLoading

	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependencies are correctly managed
	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			channel: channelQuery.data,
			messages: allMessages,
			loadMoreMessages,
			hasMoreMessages,
			isLoadingMessages,
			isLoadingMore,
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
			allMessages,
			isLoadingMessages,
			isLoadingMore,
			hasMoreMessages,
			typingUsers,
			organizationId,
			replyToMessageId,
			loadMoreMessages,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
