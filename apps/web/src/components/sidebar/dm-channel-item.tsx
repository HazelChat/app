import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId, UserId } from "@hazel/schema"
import { useRouter } from "@tanstack/react-router"
import { useCallback } from "react"
import IconClose from "~/components/icons/icon-close"
import IconDots from "~/components/icons/icon-dots"
import IconPhone from "~/components/icons/icon-phone"
import IconStar from "~/components/icons/icon-star"
import IconVolume from "~/components/icons/icon-volume"
import IconVolumeMute from "~/components/icons/icon-volume-mute"
import { Avatar } from "~/components/ui/avatar/avatar"
import { Button } from "~/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "~/components/ui/menu"
import { SidebarItem, SidebarLabel, SidebarLink } from "~/components/ui/sidebar"
import { updateChannelMemberAction } from "~/db/actions"
import { messageCollection } from "~/db/collections"
import { useChannelWithCurrentUser } from "~/db/hooks"
import { useOrganization } from "~/hooks/use-organization"
import { useUserPresence } from "~/hooks/use-presence"
import { useAuth } from "~/lib/auth"
import { matchExitWithToast, toastExitOnError } from "~/lib/toast-exit"
import { cx } from "~/utils/cx"

interface DmAvatarProps {
	member: {
		userId: UserId
		user: {
			avatarUrl?: string | null
			firstName: string
			lastName: string
		}
	}
}

function DmAvatar({ member }: DmAvatarProps) {
	const { status } = useUserPresence(member.userId)

	return (
		<Avatar
			size="xs"
			src={member.user.avatarUrl}
			alt={`${member.user.firstName} ${member.user.lastName}`}
			status={status}
		/>
	)
}

export interface DmChannelItemProps {
	channelId: ChannelId
}

export const DmChannelItem = ({ channelId }: DmChannelItemProps) => {
	const { slug: orgSlug } = useOrganization()
	const router = useRouter()

	const { channel } = useChannelWithCurrentUser(channelId)

	const { user: me } = useAuth()

	const updateMember = useAtomSet(updateChannelMemberAction, { mode: "promiseExit" })

	const filteredMembers = channel
		? (channel.members || []).filter((member) => member.userId !== me?.id)
		: []

	// Prefetch messages on hover for instant navigation
	const handleMouseEnter = useCallback(() => {
		router.preloadRoute({
			to: "/$orgSlug/chat/$id",
			params: { orgSlug: orgSlug || "", id: channelId },
		})
		messageCollection.preload()
	}, [router, orgSlug, channelId])

	const handleToggleMute = useCallback(async () => {
		if (!channel) return
		const exit = await updateMember({
			memberId: channel.currentUser.id,
			isMuted: !channel.currentUser.isMuted,
		})
		matchExitWithToast(exit, {
			onSuccess: () => {},
			successMessage: channel.currentUser.isMuted ? "Channel unmuted" : "Channel muted",
			customErrors: {
				ChannelMemberNotFoundError: () => ({
					title: "Membership not found",
					description: "You may no longer be a member of this conversation.",
					isRetryable: false,
				}),
			},
		})
	}, [channel, updateMember])

	const handleToggleFavorite = useCallback(async () => {
		if (!channel) return
		const exit = await updateMember({
			memberId: channel.currentUser.id,
			isFavorite: !channel.currentUser.isFavorite,
		})
		matchExitWithToast(exit, {
			onSuccess: () => {},
			successMessage: channel.currentUser.isFavorite ? "Removed from favorites" : "Added to favorites",
			customErrors: {
				ChannelMemberNotFoundError: () => ({
					title: "Membership not found",
					description: "You may no longer be a member of this conversation.",
					isRetryable: false,
				}),
			},
		})
	}, [channel, updateMember])

	const handleClose = useCallback(async () => {
		if (!channel) return
		const exit = await updateMember({
			memberId: channel.currentUser.id,
			isHidden: true,
		})
		// Silent success, only show error
		toastExitOnError(exit, {
			customErrors: {
				ChannelMemberNotFoundError: () => ({
					title: "Membership not found",
					description: "You may no longer be a member of this conversation.",
					isRetryable: false,
				}),
			},
		})
	}, [channel, updateMember])

	if (!channel) {
		return null
	}

	const tooltipName =
		channel.type === "single" && filteredMembers.length === 1 && filteredMembers[0]
			? `${filteredMembers[0].user.firstName} ${filteredMembers[0].user.lastName}`
			: filteredMembers.map((member) => member.user.firstName).join(", ")

	return (
		<SidebarItem
			badge={
				channel.currentUser.notificationCount > 0 ? channel.currentUser.notificationCount : undefined
			}
			tooltip={tooltipName}
		>
			{({ isCollapsed, isFocused }) => (
				<>
					<SidebarLink
						to="/$orgSlug/chat/$id"
						params={{ orgSlug: orgSlug || "", id: channelId }}
						onMouseEnter={handleMouseEnter}
						activeProps={{
							className: "bg-sidebar-accent font-medium text-sidebar-accent-fg",
						}}
					>
						{channel.type === "single" && filteredMembers.length === 1 && filteredMembers[0] ? (
							<>
								<DmAvatar member={filteredMembers[0]} />
								<SidebarLabel
									className={cx(
										"max-w-40 truncate",
										channel.currentUser.isMuted && "opacity-60",
									)}
								>
									{`${filteredMembers[0]?.user.firstName} ${filteredMembers[0]?.user.lastName}`}
								</SidebarLabel>
							</>
						) : (
							<>
								<div data-slot="avatar" className="-space-x-2 flex">
									{filteredMembers.slice(0, 2).map((member) => (
										<Avatar
											key={member.user.id}
											size="xs"
											src={member.user.avatarUrl}
											alt={member.user.firstName[0]}
											className="ring-[1.5px] ring-sidebar"
										/>
									))}

									{filteredMembers.length > 2 && (
										<Avatar
											size="xs"
											className="ring-[1.5px] ring-sidebar"
											placeholder={
												<span className="flex items-center justify-center font-semibold text-quaternary text-sm">
													+{filteredMembers.length - 2}
												</span>
											}
										/>
									)}
								</div>
								<SidebarLabel
									className={cx(
										"max-w-40 truncate",
										channel.currentUser.isMuted && "opacity-60",
									)}
								>
									{filteredMembers.map((member) => member.user.firstName).join(", ")}
								</SidebarLabel>
							</>
						)}
					</SidebarLink>

					{(!isCollapsed || isFocused) && (
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
								<MenuItem
									onAction={() => {
										// Call feature not yet implemented
									}}
								>
									<IconPhone className="size-4" />
									<MenuLabel>Call</MenuLabel>
								</MenuItem>
								<MenuSeparator />
								<MenuItem onAction={handleToggleMute}>
									{channel.currentUser.isMuted ? (
										<IconVolume className="size-4" />
									) : (
										<IconVolumeMute className="size-4" />
									)}
									<MenuLabel>{channel.currentUser.isMuted ? "Unmute" : "Mute"}</MenuLabel>
								</MenuItem>
								<MenuItem onAction={handleToggleFavorite}>
									<IconStar
										className={
											channel.currentUser.isFavorite ? "size-4 text-favorite" : "size-4"
										}
									/>
									<MenuLabel>
										{channel.currentUser.isFavorite ? "Unfavorite" : "Favorite"}
									</MenuLabel>
								</MenuItem>
								<MenuItem intent="danger" onAction={handleClose}>
									<IconClose className="size-4" />
									<MenuLabel>Close</MenuLabel>
								</MenuItem>
							</MenuContent>
						</Menu>
					)}
				</>
			)}
		</SidebarItem>
	)
}
