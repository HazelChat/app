import { eq, useLiveQuery } from "@tanstack/react-db"
import { format } from "date-fns"
import { Dialog, DialogTrigger, Popover } from "react-aria-components"
import { messageCollection, pinnedMessageCollection } from "~/db/collections"
import { useChat } from "~/hooks/use-chat"
import { ButtonUtility } from "../base/buttons/button-utility"
import IconClose from "../icons/icon-close"
import IconPin from "../icons/icon-pin"
import { MessageAuthorHeader } from "./message-item"
import { UserProfilePopover } from "./user-profile-popover"

export function PinnedMessagesModal() {
	const { channelId, unpinMessage } = useChat()

	const { data: pinnedMessages } = useLiveQuery(
		(q) =>
			q
				.from({ pinned: pinnedMessageCollection })
				.where(({ pinned }) => eq(pinned.channelId, channelId))
				.innerJoin({ message: messageCollection }, ({ pinned, message }) =>
					eq(pinned.messageId, message.id),
				)
				.orderBy(({ pinned }) => pinned.pinnedAt, "desc"),
		[channelId],
	)

	const scrollToMessage = (messageId: string) => {
		const element = document.getElementById(`message-${messageId}`)
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" })

			// Add a highlight effect
			element.classList.add("bg-quaternary/30")
			setTimeout(() => {
				element.classList.remove("bg-quaternary/30")
			}, 2000)
		}
	}

	const sortedPins = [...(pinnedMessages || [])].sort(
		(a, b) => a.pinned.pinnedAt.getTime() - b.pinned.pinnedAt.getTime(),
	)

	return (
		<DialogTrigger>
			<ButtonUtility size="sm" color="tertiary" tooltip="View pinned messages" icon={IconPin} />

			<Popover placement="bottom end" className="w-96">
				<Dialog className="p-0">
					<div className="rounded-lg border border-primary bg-primary shadow-lg">
						{/* Header */}
						<div className="flex items-center gap-2 border-primary border-b px-4 py-3">
							<IconPin className="size-4 text-secondary" />
							<h3 className="font-semibold text-sm">Pinned Messages</h3>
							<span className="ml-auto text-secondary text-xs">
								{sortedPins.length} {sortedPins.length === 1 ? "pin" : "pins"}
							</span>
						</div>

						{/* Content */}
						<div className="max-h-[400px] overflow-y-auto">
							{sortedPins.length === 0 ? (
								<div className="px-4 py-8 text-center">
									<p className="text-secondary text-sm">No pinned messages yet</p>
									<p className="mt-1 text-quaternary text-xs">
										Pin important messages to keep them easily accessible
									</p>
								</div>
							) : (
								<div className="flex flex-col">
									{sortedPins.map((pinnedMessage) => (
										<button
											key={pinnedMessage.pinned.messageId}
											onClick={() => scrollToMessage(pinnedMessage.pinned.messageId)}
											className="group relative w-full cursor-pointer border-primary border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary"
											type="button"
										>
											{/* Unpin Button */}
											<button
												onClick={(e) => {
													e.stopPropagation()
													unpinMessage(pinnedMessage.pinned.id)
												}}
												className="absolute top-2 right-2 rounded p-1 opacity-0 transition-opacity hover:bg-tertiary group-hover:opacity-100"
												aria-label="Unpin message"
												type="button"
											>
												<IconClose className="size-3.5 text-secondary" />
											</button>

											{/* Message Content */}
											<div className="flex gap-3 pr-8">
												<UserProfilePopover userId={pinnedMessage.message.authorId} />
												<div className="min-w-0 flex-1">
													<MessageAuthorHeader message={pinnedMessage.message} />
													<p className="mt-1 line-clamp-2 text-secondary text-sm">
														{pinnedMessage.message.content}
													</p>
												</div>
											</div>

											{/* Pinned Date */}
											<div className="mt-2 text-secondary text-xs">
												Pinned{" "}
												{format(pinnedMessage.pinned.pinnedAt, "MMM d 'at' h:mm a")}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</Dialog>
			</Popover>
		</DialogTrigger>
	)
}
