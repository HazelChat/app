import { Avatar } from "~/components/base/avatar/avatar"
import { Tooltip, TooltipTrigger } from "~/components/base/tooltip/tooltip"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import { useChannel } from "~/db/hooks"
import { useChat } from "~/hooks/use-chat"
import { useAuth } from "~/providers/auth-provider"
import { ButtonUtility } from "../base/buttons/button-utility"
import IconPhone from "../icons/IconPhone"
import { PinnedMessagesModal } from "./pinned-messages-modal"

export function ChatHeader() {
	const { channelId } = useChat()
	const { user } = useAuth()

	// TODO: XD
	const { isUserOnline } = {
		isUserOnline: (..._args: any[]) => true,
	}

	const { channel } = useChannel(channelId)

	if (!channel) {
		return (
			<div className="flex h-14 flex-shrink-0 items-center border-sidebar-border border-b px-4">
				<div className="h-4 w-32 animate-pulse rounded bg-muted" />
			</div>
		)
	}

	const isDirectMessage = channel.type === "direct" || channel.type === "single"
	const otherMembers = channel.members.filter((member) => member.userId !== user?.id)

	return (
		<div className="flex h-14 flex-shrink-0 items-center justify-between border-sidebar-border border-b bg-sidebar px-4">
			<div className="flex items-center gap-3">
				{isDirectMessage ? (
					<>
						{otherMembers && otherMembers.length > 0 && (
							<Avatar
								size="sm"
								src={otherMembers[0]?.user.avatarUrl}
								alt={`${otherMembers[0]?.user.firstName} ${otherMembers[0]?.user.lastName}`}
								status={isUserOnline(otherMembers[0]?.userId!) ? "online" : "offline"}
							/>
						)}
						<div>
							<h2 className="font-semibold text-sm">
								{otherMembers
									.slice(0, 3)
									?.map((member) => `${member.user.firstName} ${member.user.lastName}`)
									.join(", ") || "Direct Message"}{" "}
								<Tooltip
									arrow
									title={otherMembers
										?.map((member) => `${member.user.firstName} ${member.user.lastName}`)
										.join(", ")}
								>
									<TooltipTrigger className="font-normal text-secondary text-xs">
										{otherMembers.length > 3 && ` +${otherMembers.length - 3} more`}
									</TooltipTrigger>
								</Tooltip>
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
				<ButtonUtility
					to="/$orgSlug/call"
					params={{
						orgSlug: channel.organizationId,
					}}
					size="sm"
					color="tertiary"
					tooltip="Call"
					icon={IconPhone}
				/>

				<PinnedMessagesModal />
			</div>
		</div>
	)
}
