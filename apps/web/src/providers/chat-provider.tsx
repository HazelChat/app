import { Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import type { Channel } from "@hazel/db/models"
import {
	type AttachmentId,
	ChannelId,
	type MessageId,
	type MessageReactionId,
	type OrganizationId,
	PinnedMessageId,
	UserId,
} from "@hazel/db/schema"
import { Cause, Exit } from "effect"
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react"
import { toast } from "sonner"
import {
	activeThreadChannelIdAtom,
	activeThreadMessageIdAtom,
	isUploadingAtomFamily,
	replyToMessageAtomFamily,
	type UploadingFile,
	uploadedAttachmentsAtomFamily,
	uploadingFilesAtomFamily,
} from "~/atoms/chat-atoms"
import { channelByIdAtomFamily } from "~/atoms/chat-query-atoms"
import { sendMessageEffect as sendMessageAction, toggleReactionEffect } from "~/db/actions"
import {
	channelCollection,
	messageCollection,
	messageReactionCollection,
	pinnedMessageCollection,
} from "~/db/collections"
import { useAuth } from "~/lib/auth"

interface ChatContextValue {
	channelId: ChannelId
	organizationId: OrganizationId
	channel: typeof Channel.Model.Type | undefined
	sendMessage: (props: { content: string; attachments?: AttachmentId[] }) => void
	editMessage: (messageId: MessageId, content: string) => Promise<void>
	deleteMessage: (messageId: MessageId) => void
	addReaction: (messageId: MessageId, emoji: string) => void
	removeReaction: (reactionId: MessageReactionId) => void
	pinMessage: (messageId: MessageId) => void
	unpinMessage: (pinnedMessageId: PinnedMessageId) => void
	createThread: (messageId: MessageId, threadChannelId: ChannelId | null) => Promise<void>
	openThread: (threadChannelId: ChannelId, originalMessageId: MessageId) => void
	closeThread: () => void
	activeThreadChannelId: ChannelId | null
	activeThreadMessageId: MessageId | null
	replyToMessageId: MessageId | null
	setReplyToMessageId: (messageId: MessageId | null) => void
	attachmentIds: AttachmentId[]
	addAttachment: (attachmentId: AttachmentId) => void
	removeAttachment: (attachmentId: AttachmentId) => void
	clearAttachments: () => void
	isUploading: boolean
	setIsUploading: (value: boolean) => void
	uploadingFiles: UploadingFile[]
	addUploadingFile: (file: UploadingFile) => void
	removeUploadingFile: (fileId: string) => void
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

	const sendMessageMutation = useAtomSet(sendMessageAction, { mode: "promiseExit" })
	const toggleReactionMutation = useAtomSet(toggleReactionEffect, { mode: "promiseExit" })

	const replyToMessageId = useAtomValue(replyToMessageAtomFamily(channelId))
	const setReplyToMessageId = useAtomSet(replyToMessageAtomFamily(channelId))

	const activeThreadChannelId = useAtomValue(activeThreadChannelIdAtom)
	const setActiveThreadChannelId = useAtomSet(activeThreadChannelIdAtom)
	const activeThreadMessageId = useAtomValue(activeThreadMessageIdAtom)
	const setActiveThreadMessageId = useAtomSet(activeThreadMessageIdAtom)

	const attachmentIds = useAtomValue(uploadedAttachmentsAtomFamily(channelId))
	const setAttachmentIds = useAtomSet(uploadedAttachmentsAtomFamily(channelId))

	const isUploading = useAtomValue(isUploadingAtomFamily(channelId))
	const setIsUploading = useAtomSet(isUploadingAtomFamily(channelId))

	const uploadingFiles = useAtomValue(uploadingFilesAtomFamily(channelId))
	const setUploadingFiles = useAtomSet(uploadingFilesAtomFamily(channelId))

	const channelResult = useAtomValue(channelByIdAtomFamily(channelId))
	const channel = Result.getOrElse(channelResult, () => undefined)?.[0]

	const addAttachment = useCallback(
		(attachmentId: AttachmentId) => {
			setAttachmentIds((prev) => [...prev, attachmentId])
		},
		[setAttachmentIds],
	)

	const removeAttachment = useCallback(
		(attachmentId: AttachmentId) => {
			setAttachmentIds((prev) => prev.filter((id) => id !== attachmentId))
		},
		[setAttachmentIds],
	)

	const clearAttachments = useCallback(() => {
		setAttachmentIds([])
	}, [setAttachmentIds])

	const addUploadingFile = useCallback(
		(file: UploadingFile) => {
			setUploadingFiles((prev) => [...prev, file])
		},
		[setUploadingFiles],
	)

	const removeUploadingFile = useCallback(
		(fileId: string) => {
			setUploadingFiles((prev) => prev.filter((f) => f.fileId !== fileId))
		},
		[setUploadingFiles],
	)

	const sendMessage = useCallback(
		async ({ content, attachments }: { content: string; attachments?: AttachmentId[] }) => {
			if (!user?.id) return

			const attachmentsToSend = attachments ?? attachmentIds

			const tx = await sendMessageMutation({
				channelId,
				authorId: UserId.make(user.id),
				content,
				replyToMessageId,
				threadChannelId: null,
				attachmentIds: attachmentsToSend as AttachmentId[] | undefined,
			})

			Exit.match(tx, {
				onSuccess: () => {
					setReplyToMessageId(null)
					clearAttachments()
				},
				onFailure: (error) => {
					toast.error("Failed to send message", {
						description: Cause.pretty(error),
					})
				},
			})
		},
		[
			channelId,
			user?.id,
			replyToMessageId,
			attachmentIds,
			sendMessageMutation,
			setReplyToMessageId,
			clearAttachments,
		],
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
		async (messageId: MessageId, emoji: string) => {
			if (!user?.id) return

			const tx = await toggleReactionMutation({
				messageId,
				emoji,
				userId: UserId.make(user.id),
			})

			Exit.match(tx, {
				onSuccess: () => {
					// Reaction toggled successfully
				},
				onFailure: (error) => {
					toast.error("Failed to toggle reaction", {
						description: Cause.pretty(error),
					})
				},
			})
		},
		[user?.id, toggleReactionMutation],
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
		async (messageId: MessageId, existingThreadChannelId: ChannelId | null) => {
			if (existingThreadChannelId) {
				setActiveThreadChannelId(existingThreadChannelId)
				setActiveThreadMessageId(messageId)
			} else {
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

				setActiveThreadChannelId(threadChannelId)
				setActiveThreadMessageId(messageId)
			}
		},
		[channelId, organizationId, setActiveThreadChannelId, setActiveThreadMessageId],
	)

	const openThread = useCallback(
		(threadChannelId: ChannelId, originalMessageId: MessageId) => {
			setActiveThreadChannelId(threadChannelId)
			setActiveThreadMessageId(originalMessageId)
		},
		[setActiveThreadChannelId, setActiveThreadMessageId],
	)

	const closeThread = useCallback(() => {
		setActiveThreadChannelId(null)
		setActiveThreadMessageId(null)
	}, [setActiveThreadChannelId, setActiveThreadMessageId])

	const contextValue = useMemo<ChatContextValue>(
		() => ({
			channelId,
			organizationId,
			channel,
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
			attachmentIds,
			addAttachment,
			removeAttachment,
			clearAttachments,
			isUploading,
			setIsUploading,
			uploadingFiles,
			addUploadingFile,
			removeUploadingFile,
		}),
		[
			channelId,
			organizationId,
			channel,
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
			attachmentIds,
			addAttachment,
			removeAttachment,
			clearAttachments,
			isUploading,
			setIsUploading,
			uploadingFiles,
			addUploadingFile,
			removeUploadingFile,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
