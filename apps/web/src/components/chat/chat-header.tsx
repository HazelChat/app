import { Avatar } from "~/components/base/avatar/avatar"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import { usePresence } from "~/components/presence/presence-provider"
import { useChat } from "~/hooks/use-chat"
import { PinnedMessagesModal } from "./pinned-messages-modal"

export function ChatHeader() {
	const { channel } = useChat()
	const { isUserOnline } = usePresence()

	if (!channel) {
		return (
			<div className="flex h-14 items-center border-border border-b px-4">
				<div className="h-4 w-32 animate-pulse rounded bg-muted" />
			</div>
		)
	}

	const isDirectMessage = channel.type === "direct" || channel.type === "single"
	const _memberCount = channel.members?.length || 0
	const _onlineCount = channel.members?.filter((member) => isUserOnline(member.userId)).length || 0

	return (
		<div className="flex h-14 items-center justify-between border-sidebar-border border-b bg-sidebar px-4">
			<div className="flex items-center gap-3">
				{isDirectMessage ? (
					<>
						{channel.members && channel.members.length > 0 && (
							<Avatar
								size="sm"
								src={channel.members[0].user.avatarUrl}
								alt={`${channel.members[0].user.firstName} ${channel.members[0].user.lastName}`}
								status={isUserOnline(channel.members[0].userId) ? "online" : "offline"}
							/>
						)}
						<div>
							<h2 className="font-semibold text-sm">
								{channel.members
									?.map((member) => `${member.user.firstName} ${member.user.lastName}`)
									.join(", ") || "Direct Message"}
							</h2>
						</div>
					</>
				) : (
					<>
						<IconHashtagStroke className="size-5 text-secondary" />
						<div>
							<h2 className="font-semibold text-sm">{channel.name}</h2>
						</div>
					</>
				)}
			</div>

			<div className="flex items-center gap-2">
				<PinnedMessagesModal />
				{/* Add other channel actions here */}
			</div>
		</div>
	)
}
