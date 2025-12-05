import { useAtomSet } from "@effect-atom/atom-react"
import type { Channel, ChannelMember } from "@hazel/db/schema"
import { useNavigate } from "@tanstack/react-router"
import { Exit } from "effect"
import { useState } from "react"
import { toast } from "sonner"
import { deleteChannelMemberMutation, updateChannelMemberMutation } from "~/atoms/channel-member-atoms"
import IconDots from "~/components/icons/icon-dots"
import IconGear from "~/components/icons/icon-gear"
import IconHashtag from "~/components/icons/icon-hashtag"
import IconLeave from "~/components/icons/icon-leave"
import IconStar from "~/components/icons/icon-star"
import IconTrash from "~/components/icons/icon-trash"
import IconVolume from "~/components/icons/icon-volume"
import IconVolumeMute from "~/components/icons/icon-volume-mute"
import { DeleteChannelModal } from "~/components/modals/delete-channel-modal"
import { Button } from "~/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "~/components/ui/menu"
import { SidebarItem, SidebarLabel, SidebarLink } from "~/components/ui/sidebar"
import { channelCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"

interface ChannelItemProps {
	channel: Omit<Channel, "updatedAt"> & { updatedAt: Date | null }
	member: ChannelMember
}

export function ChannelItem({ channel, member }: ChannelItemProps) {
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)

	const { slug } = useOrganization()
	const navigate = useNavigate()

	// Use Effect Atom mutations for channel member operations
	const updateMember = useAtomSet(updateChannelMemberMutation, { mode: "promiseExit" })
	const deleteMember = useAtomSet(deleteChannelMemberMutation, { mode: "promiseExit" })

	const handleToggleMute = async () => {
		const exit = await updateMember({
			payload: {
				id: member.id,
				channelId: member.channelId,
				isHidden: member.isHidden,
				isMuted: !member.isMuted,
				isFavorite: member.isFavorite,
				lastSeenMessageId: member.lastSeenMessageId,
				notificationCount: member.notificationCount,
			},
		})

		Exit.match(exit, {
			onSuccess: () => {
				toast.success(member.isMuted ? "Channel unmuted" : "Channel muted")
			},
			onFailure: (cause) => {
				console.error("Failed to toggle mute:", cause)
				toast.error("Failed to update channel")
			},
		})
	}

	const handleToggleFavorite = async () => {
		const exit = await updateMember({
			payload: {
				id: member.id,
				channelId: member.channelId,
				isHidden: member.isHidden,
				isMuted: member.isMuted,
				isFavorite: !member.isFavorite,
				lastSeenMessageId: member.lastSeenMessageId,
				notificationCount: member.notificationCount,
			},
		})

		Exit.match(exit, {
			onSuccess: () => {
				toast.success(member.isFavorite ? "Removed from favorites" : "Added to favorites")
			},
			onFailure: (cause) => {
				console.error("Failed to toggle favorite:", cause)
				toast.error("Failed to update channel")
			},
		})
	}

	const handleDeleteChannel = async () => {
		try {
			channelCollection.delete(channel.id)
			toast.success("Channel deleted successfully")
		} catch (error) {
			console.error("Failed to delete channel:", error)
			toast.error("Failed to delete channel")
		}
	}

	const handleLeaveChannel = async () => {
		const exit = await deleteMember({
			payload: { id: member.id },
		})

		Exit.match(exit, {
			onSuccess: () => {
				toast.success("Left channel successfully")
			},
			onFailure: (cause) => {
				console.error("Failed to leave channel:", cause)
				toast.error("Failed to leave channel")
			},
		})
	}

	return (
		<>
			<SidebarItem
				tooltip={channel.name}
				badge={member.notificationCount > 0 ? member.notificationCount : undefined}
			>
				<SidebarLink
					to="/$orgSlug/chat/$id"
					params={{ orgSlug: slug, id: channel.id }}
					activeProps={{
						className: "bg-sidebar-accent font-medium text-sidebar-accent-fg",
					}}
				>
					<IconHashtag />
					<SidebarLabel>{channel.name}</SidebarLabel>
				</SidebarLink>
				<Menu>
					<Button
						intent="plain"
						size="sq-xs"
						data-slot="menu-trigger"
						className="size-5 text-muted-fg"
					>
						<IconDots className="size-4" />
					</Button>
					<MenuContent placement="right top" className="w-42">
						<MenuItem onAction={handleToggleMute}>
							{member.isMuted ? (
								<IconVolume className="size-4" />
							) : (
								<IconVolumeMute className="size-4" />
							)}
							<MenuLabel>{member.isMuted ? "Unmute" : "Mute"}</MenuLabel>
						</MenuItem>
						<MenuItem onAction={handleToggleFavorite}>
							<IconStar className={member.isFavorite ? "size-4 text-favorite" : "size-4"} />
							<MenuLabel>{member.isFavorite ? "Unfavorite" : "Favorite"}</MenuLabel>
						</MenuItem>
						<MenuSeparator />
						<MenuItem
							onAction={() =>
								navigate({
									to: "/$orgSlug/channels/$channelId/settings",
									params: { orgSlug: slug, channelId: channel.id },
								})
							}
						>
							<IconGear />
							<MenuLabel>Settings</MenuLabel>
						</MenuItem>
						<MenuItem intent="danger" onAction={() => setDeleteModalOpen(true)}>
							<IconTrash />
							<MenuLabel>Delete</MenuLabel>
						</MenuItem>
						<MenuSeparator />
						<MenuItem intent="danger" onAction={handleLeaveChannel}>
							<IconLeave />
							<MenuLabel className="text-destructive">Leave</MenuLabel>
						</MenuItem>
					</MenuContent>
				</Menu>
			</SidebarItem>

			{deleteModalOpen && (
				<DeleteChannelModal
					channelName={channel.name}
					isOpen={true}
					onOpenChange={(isOpen) => !isOpen && setDeleteModalOpen(false)}
					onConfirm={handleDeleteChannel}
				/>
			)}
		</>
	)
}
