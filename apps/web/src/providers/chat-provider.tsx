import { Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import type { Channel } from "@hazel/domain/models"
import {
	type AttachmentId,
	type ChannelId,
	type MessageId,
	type MessageReactionId,
	type OrganizationId,
	type PinnedMessageId,
	UserId,
} from "@hazel/schema"
import { Exit } from "effect"
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react"
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
import {
	createThreadAction,
	deleteMessageAction,
	editMessageAction,
	pinMessageAction,
	sendMessageAction,
	toggleReactionAction,
	unpinMessageAction,
} from "~/db/actions"
import { useAuth } from "~/lib/auth"
import { matchExitWithToast, toastExitOnError } from "~/lib/toast-exit"

interface ChatContextValue {
	channelId: ChannelId
	organizationId: OrganizationId
	channel: typeof Channel.Model.Type | undefined
	sendMessage: (props: { content: string; attachments?: AttachmentId[] }) => void
	editMessage: (messageId: MessageId, content: string) => Promise<void>
	deleteMessage: (messageId: MessageId) => void
	addReaction: (messageId: MessageId, channelId: ChannelId, emoji: string) => void
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
	addUploadingFile: (file: Omit<UploadingFile, "progress">) => void
	updateUploadingFileProgress: (fileId: string, progress: number) => void
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
	onMessageSent?: () => void
}

export function ChatProvider({ channelId, organizationId, children, onMessageSent }: ChatProviderProps) {
	const { user } = useAuth()

	const sendMessageMutation = useAtomSet(sendMessageAction, { mode: "promiseExit" })
	const toggleReactionMutation = useAtomSet(toggleReactionAction, { mode: "promiseExit" })
	const createThreadMutation = useAtomSet(createThreadAction, { mode: "promiseExit" })
	const editMessageMutation = useAtomSet(editMessageAction, { mode: "promiseExit" })
	const deleteMessageMutation = useAtomSet(deleteMessageAction, { mode: "promiseExit" })
	const pinMessageMutation = useAtomSet(pinMessageAction, { mode: "promiseExit" })
	const unpinMessageMutation = useAtomSet(unpinMessageAction, { mode: "promiseExit" })

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
	const channel = Result.getOrElse(channelResult, () => undefined)

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
		(file: Omit<UploadingFile, "progress">) => {
			setUploadingFiles((prev) => [...prev, { ...file, progress: 0 }])
		},
		[setUploadingFiles],
	)

	const updateUploadingFileProgress = useCallback(
		(fileId: string, progress: number) => {
			setUploadingFiles((prev) => prev.map((f) => (f.fileId === fileId ? { ...f, progress } : f)))
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

			toastExitOnError(tx, {
				error: "Failed to send message",
				customErrors: {
					ChannelNotFoundError: () => ({
						title: "Channel not found",
						description: "This channel may have been deleted.",
						isRetryable: false,
					}),
				},
			})
			if (Exit.isSuccess(tx)) {
				setReplyToMessageId(null)
				clearAttachments()
				onMessageSent?.()
			}
		},
		[
			channelId,
			user?.id,
			replyToMessageId,
			attachmentIds,
			sendMessageMutation,
			setReplyToMessageId,
			clearAttachments,
			onMessageSent,
		],
	)

	const editMessage = useCallback(
		async (messageId: MessageId, content: string) => {
			const exit = await editMessageMutation({ messageId, content })
			toastExitOnError(exit, {
				error: "Failed to edit message",
				customErrors: {
					MessageNotFoundError: () => ({
						title: "Message not found",
						description: "This message may have been deleted.",
						isRetryable: false,
					}),
				},
			})
		},
		[editMessageMutation],
	)

	const deleteMessage = useCallback(
		async (messageId: MessageId) => {
			const exit = await deleteMessageMutation({ messageId })
			toastExitOnError(exit, {
				error: "Failed to delete message",
				customErrors: {
					MessageNotFoundError: () => ({
						title: "Message not found",
						description: "This message may have already been deleted.",
						isRetryable: false,
					}),
				},
			})
		},
		[deleteMessageMutation],
	)

	const addReaction = useCallback(
		async (messageId: MessageId, channelId: ChannelId, emoji: string) => {
			if (!user?.id) return

			const tx = await toggleReactionMutation({
				messageId,
				channelId,
				emoji,
				userId: UserId.make(user.id),
			})

			toastExitOnError(tx, {
				error: "Failed to toggle reaction",
				customErrors: {
					MessageNotFoundError: () => ({
						title: "Message not found",
						description: "This message may have been deleted.",
						isRetryable: false,
					}),
				},
			})
		},
		[user?.id, toggleReactionMutation],
	)

	// Note: removeReaction is deprecated - use addReaction which toggles reactions
	// Keeping for interface compatibility but this is a no-op since toggleReaction handles removal
	const removeReaction = useCallback((_reactionId: MessageReactionId) => {
		console.warn("removeReaction is deprecated - use addReaction to toggle reactions")
	}, [])

	const pinMessage = useCallback(
		async (messageId: MessageId) => {
			if (!user?.id) return

			const exit = await pinMessageMutation({
				messageId,
				channelId,
				userId: UserId.make(user.id),
			})

			matchExitWithToast(exit, {
				onSuccess: () => {},
				successMessage: "Message pinned",
				customErrors: {
					MessageNotFoundError: () => ({
						title: "Message not found",
						description: "This message may have been deleted.",
						isRetryable: false,
					}),
				},
			})
		},
		[channelId, user?.id, pinMessageMutation],
	)

	const unpinMessage = useCallback(
		async (pinnedMessageId: PinnedMessageId) => {
			const exit = await unpinMessageMutation({ pinnedMessageId })

			matchExitWithToast(exit, {
				onSuccess: () => {},
				successMessage: "Message unpinned",
				customErrors: {
					PinnedMessageNotFoundError: () => ({
						title: "Pin not found",
						description: "This message may have already been unpinned.",
						isRetryable: false,
					}),
				},
			})
		},
		[unpinMessageMutation],
	)

	const createThread = useCallback(
		async (messageId: MessageId, existingThreadChannelId: ChannelId | null) => {
			if (existingThreadChannelId) {
				// Thread already exists - just open it
				setActiveThreadChannelId(existingThreadChannelId)
				setActiveThreadMessageId(messageId)
			} else {
				if (!user?.id) return

				// Create new thread via action
				const exit = await createThreadMutation({
					messageId,
					parentChannelId: channelId,
					organizationId,
					currentUserId: UserId.make(user.id),
				})

				toastExitOnError(exit, {
					error: "Failed to create thread",
					customErrors: {},
				})
				if (Exit.isSuccess(exit)) {
					setActiveThreadChannelId(exit.value.mutateResult.threadChannelId)
					setActiveThreadMessageId(messageId)
				}
			}
		},
		[
			channelId,
			organizationId,
			user?.id,
			createThreadMutation,
			setActiveThreadChannelId,
			setActiveThreadMessageId,
		],
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
			updateUploadingFileProgress,
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
			updateUploadingFileProgress,
			removeUploadingFile,
		],
	)

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
