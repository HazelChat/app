import { convexQuery } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import type { FunctionReturnType } from "convex/server"
import { format } from "date-fns"
import { useRef, useState } from "react"
import {
	Heading as AriaHeading,
	Button,
	DialogTrigger,
} from "react-aria-components"
import { toast } from "sonner"
import { Dialog, Modal, ModalFooter, ModalOverlay } from "~/components/application/modals/modal"
import { Button as StyledButton } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Checkbox } from "~/components/base/checkbox/checkbox"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import IconUserPlusStroke from "~/components/icons/IconUserPlusStroke"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { useChat } from "~/hooks/use-chat"
import { cx } from "~/utils/cx"
import { IconNotification } from "../application/notifications/notifications"
import { Avatar } from "../base/avatar/avatar"
import { Badge } from "../base/badges/badges"
import { MarkdownReadonly } from "../markdown-readonly"
import { IconThread } from "../temp-icons/thread"
import { MessageAttachments } from "./message-attachments"
import { MessageReplySection } from "./message-reply-section"
import { MessageToolbar } from "./message-toolbar"
import { UserProfilePopover } from "./user-profile-popover"

type Message = FunctionReturnType<typeof api.messages.getMessages>["page"][0]

interface MessageItemProps {
	message: Message
	isGroupStart?: boolean
	isGroupEnd?: boolean
	isFirstNewMessage?: boolean
	isPinned?: boolean
}

const channels = [
	{ id: "ch_001", name: "general", description: "Casual discussions and announcements" },
	{ id: "ch_002", name: "development", description: "Talk about coding, debugging, and dev tools" },
	{ id: "ch_003", name: "design", description: "Share UI/UX ideas and design feedback" },
	{ id: "ch_004", name: "random", description: "Off-topic chat and fun conversations" },
]

export function MessageItem({
	message,
	isGroupStart = false,
	isGroupEnd = false,
	isFirstNewMessage = false,
	isPinned = false,
}: MessageItemProps) {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const {
		editMessage,
		deleteMessage,
		addReaction,
		removeReaction,
		setReplyToMessageId,
		pinMessage,
		unpinMessage,
		pinnedMessages,
		createThread,
		openThread,
	} = useChat()
	const [openInviteUserToSpecificChannel, setOpenInviteUserToSpecificChannel] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [hasBeenHovered, setHasBeenHovered] = useState(false)
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
	const _editorRef = useRef<any>(null)

	const { data: currentUser } = useQuery(
		convexQuery(api.me.getCurrentUser, {
			organizationId: orgId as Id<"organizations">,
		}),
	)
	const isOwnMessage = currentUser?._id === message.authorId
	const isEdited = message.updatedAt && message.updatedAt > message._creationTime

	const showAvatar = isGroupStart || !!message.replyToMessageId
	const isRepliedTo = !!message.replyToMessageId
	const isMessagePinned = pinnedMessages?.some((p) => p.messageId === message._id) || false

	const handleReaction = (emoji: string) => {
		const existingReaction = message.reactions?.find(
			(r) => r.emoji === emoji && r.userId === currentUser?._id,
		)
		if (existingReaction) {
			removeReaction(message._id, emoji)
		} else {
			addReaction(message._id, emoji)
		}
	}

	const handleDelete = () => {
		deleteMessage(message._id)
	}

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content)
		toast.custom((t) => (
			<IconNotification
				title="Sucessfully copied!"
				description="Message content has been copied to your clipboard."
				color="success"
				onClose={() => toast.dismiss(t)}
			/>
		))
	}

	const handleMouseEnter = () => {
		// Clear any existing timeout
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current)
		}
		// Set a small delay to prevent toolbar flash during quick scrolling
		hoverTimeoutRef.current = setTimeout(() => {
			setHasBeenHovered(true)
		}, 100)
	}

	const handleMouseLeave = () => {
		// Clear the timeout if mouse leaves before toolbar shows
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current)
		}
	}

	return (
		<>
			<DialogTrigger
				isOpen={openInviteUserToSpecificChannel}
				onOpenChange={setOpenInviteUserToSpecificChannel}
			>
				<ModalOverlay className="z-50" isDismissable>
					<Modal>
						<Dialog>
							{({ close }) => (
								<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-130">
									<CloseButton
										onClick={close}
										theme="light"
										size="lg"
										className="absolute top-3 right-3"
									/>
									<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
										<div className="relative w-max">
											<FeaturedIcon
												color="gray"
												size="lg"
												theme="modern"
												icon={IconUserPlusStroke}
											/>
											<BackgroundPattern
												pattern="circle"
												size="sm"
												className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
											/>
										</div>
										<div className="z-10 flex flex-col gap-0.5">
											<AriaHeading
												slot="title"
												className="font-semibold text-md text-primary"
											>
												Invite Bob Smith to specific channels
											</AriaHeading>
											<p className="text-sm text-tertiary">
												Select a channel to invite this user to join.
											</p>
										</div>
									</div>
									<div className="h-5 w-full" />
									<div className="flex max-h-96 flex-col gap-4 overflow-y-auto px-4 sm:px-6">
										{channels.map((channel) => (
											<Checkbox
												label={channel.name}
												hint={channel.description}
												size="sm"
												id={channel.id}
											/>
										))}
									</div>
									<ModalFooter>
										<StyledButton color="secondary" size="lg" onClick={close}>
											Cancel
										</StyledButton>
										<StyledButton color="primary" size="lg" onClick={close}>
											Invite
										</StyledButton>
									</ModalFooter>
								</div>
							)}
						</Dialog>
					</Modal>
				</ModalOverlay>
			</DialogTrigger>

			{/* biome-ignore lint/a11y/noStaticElementInteractions: needed for hover interaction */}
			<div
				id={`message-${message._id}`}
				className={cx(
					`group relative flex flex-col rounded-md rounded-l-none px-4 py-0.5 transition-colors hover:bg-secondary`,
					isGroupStart ? "mt-2" : "",
					isGroupEnd ? "mb-2" : "",
					isFirstNewMessage
						? "border-emerald-500 border-l-2 bg-emerald-500/20 hover:bg-emerald-500/15"
						: "",
					isMessagePinned
						? "border-amber-500 border-l-2 bg-amber-500/10 hover:bg-amber-500/15"
						: "",
				)}
				data-id={message._id}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				{/* Reply Section */}
				{isRepliedTo && message.replyToMessageId && (
					<MessageReplySection
						replyToMessageId={message.replyToMessageId}
						channelId={message.channelId}
						organizationId={orgId as Id<"organizations">}
						onClick={() => {
							const replyElement = document.getElementById(
								`message-${message.replyToMessageId}`,
							)
							if (replyElement) {
								replyElement.scrollIntoView({ behavior: "smooth", block: "center" })
								// Add a highlight effect
								replyElement.classList.add("bg-quaternary/30")
								setTimeout(() => {
									replyElement.classList.remove("bg-quaternary/30")
								}, 2000)
							}
						}}
					/>
				)}

				{/* Main Content Row */}
				<div className="flex gap-4">
					{showAvatar ? (
						<UserProfilePopover
							user={{ ...message.author, _id: message.authorId }}
							isOwnProfile={isOwnMessage}
							isFavorite={false} // TODO: Get favorite status from state
							isMuted={false} // TODO: Get muted status from state
							onInviteToChannel={() => setOpenInviteUserToSpecificChannel(true)}
							onEditProfile={() => {
								// TODO: Implement edit profile
								console.log("Edit profile")
							}}
							onViewFullProfile={() => {
								// TODO: Implement view full profile
								console.log("View full profile")
							}}
							onToggleMute={() => {
								// TODO: Implement mute/unmute functionality
								console.log("Toggle mute")
							}}
							onToggleFavorite={() => {
								// TODO: Implement favorite/unfavorite functionality
								console.log("Toggle favorite")
							}}
							onCopyUserId={() => {
								// Additional callback after copying user ID
								console.log("User ID copied:", message.authorId)
							}}
						/>
					) : (
						<div className="flex w-10 items-center justify-end pr-1 text-[10px] text-secondary leading-tight opacity-0 group-hover:opacity-100">
							{format(message._creationTime, "HH:mm")}
						</div>
					)}

					{/* Content Section */}
					<div className="min-w-0 flex-1">
						{/* Author header (only when showing avatar) */}
						{showAvatar && (
							<div className="flex items-baseline gap-2">
								<span className="font-semibold">
									{message.author
										? `${message.author.firstName} ${message.author.lastName}`
										: "Unknown"}
								</span>
								<span className="text-secondary text-xs">
									{format(message._creationTime, "HH:mm")}
									{isEdited && " (edited)"}
								</span>
							</div>
						)}

						{/* Message Content */}
						{isEditing ? (
							<div className="mt-1">
								{/* <TextEditor.Root
								content={message.jsonContent}
								editable={true}
								className="gap-0"
								onCreate={(editor) => {
									// Store editor reference for save/cancel buttons
									editorRef.current = editor

									// Add keyboard handler for Escape key
									const handleKeyDown = (event: Event) => {
										const keyboardEvent = event as KeyboardEvent
										if (keyboardEvent.key === "Escape") {
											setIsEditing(false)
											keyboardEvent.preventDefault()
										} else if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
											keyboardEvent.preventDefault()
											handleEdit(editor)
										}
									}

									const editorElement = document.querySelector('[data-slate-editor="true"]')
									if (editorElement) {
										editorElement.addEventListener("keydown", handleKeyDown)
										// Store cleanup function
										;(editor as any).cleanup = () => {
											editorElement.removeEventListener("keydown", handleKeyDown)
										}
									}
								}}
								onUpdate={(editor) => {
									editorRef.current = editor
								}}
							>
								{(_editor) => (
									<>
										<div className="rounded border border-secondary p-2">
											<TextEditor.Content className="min-h-[2rem] text-sm" />
										</div>
										<div className="mt-2 flex gap-2">
											<StyledButton
												size="sm"
												color="primary"
												onClick={async () => {
													if (editorRef.current) {
														await handleEdit(editorRef.current)
													}
												}}
											>
												Save
											</StyledButton>
											<StyledButton
												size="sm"
												color="secondary"
												onClick={() => {
													setIsEditing(false)
													if (editorRef.current) {
														// Cleanup event listeners
														if ((editorRef.current as any).cleanup) {
															;(editorRef.current as any).cleanup()
														}
														editorRef.current.tf.reset()
														editorRef.current.children = message.jsonContent
													}
												}}
											>
												Cancel
											</StyledButton>
										</div>
									</>
								)}
							</TextEditor.Root> */}
              </div>
            ) : (
              <MarkdownReadonly content={message.content}></MarkdownReadonly>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                organizationId={orgId as Id<"organizations">}
              />
            )}

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(
                  message.reactions.reduce(
                    (acc, reaction) => {
                      if (!acc[reaction.emoji]) {
                        acc[reaction.emoji] = { count: 0, users: [], hasReacted: false }
                      }
                      acc[reaction.emoji].count++
                      acc[reaction.emoji].users.push(reaction.userId)
                      if (reaction.userId === currentUser?._id) {
                        acc[reaction.emoji].hasReacted = true
                      }
                      return acc
                    },
                    {} as Record<
                      string,
                      { count: number; users: string[]; hasReacted: boolean }
                    >,
                  ),
                ).map(([emoji, data]) => (
                  <Button onPress={() => handleReaction(emoji)} key={emoji}>
                    <Badge
                      type="pill-color"
                      color={data.hasReacted ? "brand" : "gray"}
                      size="md"
                    >
                      {emoji} {data.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}

            {/* Thread Button */}
            {(message.threadChannelId ||
              (message.threadMessages && message.threadMessages.length > 0)) && (
              <button
                type="button"
                onClick={() => {
                  if (message.threadChannelId) {
                    openThread(message.threadChannelId, message._id)
                  }
                }}
                className="mt-2 flex items-center gap-2 text-secondary text-sm transition-colors hover:text-primary"
              >
                <IconThread className="size-4"/>
                <span>
								{message.threadMessages?.length || 0}{" "}
                  {message.threadMessages?.length === 1 ? "reply" : "replies"}
							</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Toolbar - Only render when hovered or menu is open to improve performance */}
        {(hasBeenHovered || isMenuOpen) && (
          <MessageToolbar
            message={message}
            isOwnMessage={isOwnMessage}
            isPinned={isMessagePinned}
            onReaction={handleReaction}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
            onCopy={handleCopy}
            onReply={() => {
              setReplyToMessageId(message._id)
            }}
            onThread={() => {
              createThread(message._id)
            }}
            onForward={() => {
              // TODO: Implement forward message
              console.log("Forward message")
            }}
            onMarkUnread={() => {
              // TODO: Implement mark as unread
              console.log("Mark as unread")
            }}
            onPin={() => {
              if (isMessagePinned) {
                unpinMessage(message._id)
              } else {
                pinMessage(message._id)
              }
            }}
            onReport={() => {
              // TODO: Implement report message
              console.log("Report message")
            }}
            onViewDetails={() => {
              // TODO: Implement view details
              console.log("View details")
            }}
            onMenuOpenChange={setIsMenuOpen}
          />
        )}
      </div>
    </>
    
  )
}
