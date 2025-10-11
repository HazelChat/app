import type { ChannelId } from "@hazel/db/schema"
import { Link, useNavigate, useParams, useRouter } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import IconEdit from "~/components/icons/icon-edit"
import IconTrash from "~/components/icons/icon-trash"
import { channelCollection, channelMemberCollection, messageCollection } from "~/db/collections"
import { useChannelWithCurrentUser } from "~/db/hooks"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { cx } from "~/utils/cx"
import { DeleteChannelModal } from "../application/modals/delete-channel-modal"
import { RenameChannelModal } from "../application/modals/rename-channel-modal"
import { Avatar } from "../base/avatar/avatar"
import { Dropdown } from "../base/dropdown/dropdown"
import IconClose from "../icons/icon-close"
import IconDots from "../icons/icon-dots"
import IconHashtag from "../icons/icon-hashtag"
import IconPhone from "../icons/icon-phone"
import IconStar from "../icons/icon-star"
import IconVolume from "../icons/icon-volume"
import IconVolumeMute from "../icons/icon-volume-mute"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"

export interface ChannelItemProps {
	channelId: ChannelId
}

export const ChannelItem = ({ channelId }: ChannelItemProps) => {
	const { slug: orgSlug } = useOrganization()
	const navigate = useNavigate()
	const router = useRouter()
	const params = useParams({ strict: false })
	const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

	const { channel } = useChannelWithCurrentUser(channelId)

	// Prefetch messages on hover for instant navigation
	const handleMouseEnter = useCallback(() => {
		// Preload the route and messages when user hovers
		router.preloadRoute({
			to: "/$orgSlug/chat/$id",
			params: { orgSlug: orgSlug || "", id: channelId },
		})

		// Also ensure messages are preloaded
		messageCollection.preload()
	}, [router, orgSlug, channelId])

	const handleLeaveChannel = useCallback(() => {
		if (!channel) return
		channelMemberCollection.delete(channel.currentUser.id)
	}, [channel])

	const handleToggleMute = useCallback(() => {
		if (!channel) return
		channelMemberCollection.update(channel.currentUser.id, (member) => {
			member.isMuted = !member.isMuted
		})
	}, [channel])

	const handleToggleFavorite = useCallback(() => {
		if (!channel) return
		channelMemberCollection.update(channel.currentUser.id, (member) => {
			member.isFavorite = !member.isFavorite
		})
	}, [channel])

	const handleRename = useCallback(() => {
		setIsRenameModalOpen(true)
	}, [])

	const handleDelete = useCallback(() => {
		setIsDeleteModalOpen(true)
	}, [])

	const handleConfirmDelete = useCallback(async () => {
		if (!channel) return

		const channelIdToDelete = channel.id
		const channelNameToDisplay = channel.name

		try {
			channelCollection.delete(channelIdToDelete!)

			// If user is currently viewing this channel, redirect to organization page
			if (params.id === channelId) {
				navigate({
					to: "/$orgSlug",
					params: { orgSlug: orgSlug || "" },
				})
			}

			toast.success(`Channel #${channelNameToDisplay} has been deleted`)
		} catch (error) {
			console.error("Failed to delete channel:", error)
			toast.error("Failed to delete channel")
		}
	}, [channel, channelId, navigate, orgSlug, params.id])

	if (!channel) {
		return null
	}

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild>
				<Link
					to="/$orgSlug/chat/$id"
					params={{ orgSlug: orgSlug || "", id: channelId }}
					onMouseEnter={handleMouseEnter}
				>
					<IconHashtag className="size-5" />
					<p
						className={cx(
							"text-ellipsis text-nowrap",
							channel.currentUser.isMuted && "opacity-60",
						)}
					>
						{channel.name}
					</p>
					{channel.currentUser.notificationCount > 0 && (
						<div className="-translate-y-1/2 absolute top-1/2 right-1 flex h-2.5 items-center justify-center rounded-lg border bg-muted p-2 text-xs transition-all duration-200 group-focus-within/menu-item:right-6 group-hover/menu-action:right-6 group-hover/menu-item:right-6 group-data-[state=open]/menu-action:right-6 [&:has(+[data-sidebar=menu-action][data-state=open])]:right-6">
							{channel.currentUser.notificationCount}
						</div>
					)}
				</Link>
			</SidebarMenuButton>
			<Dropdown.Root>
				<SidebarMenuAction
					showOnHover
					className="rounded-sm text-foreground data-[state=open]:bg-muted"
				>
					<IconDots className="text-foreground" />
					<span className="sr-only">More</span>
				</SidebarMenuAction>

				<Dropdown.Popover placement="right top" className="w-42">
					<Dropdown.Menu>
						<Dropdown.Item
							onAction={handleToggleMute}
							icon={channel.currentUser.isMuted ? IconVolume : IconVolumeMute}
						>
							{channel.currentUser.isMuted ? "Unmute" : "Mute"}
						</Dropdown.Item>
						<Dropdown.Item
							onAction={handleToggleFavorite}
							icon={(props) =>
								channel.currentUser.isFavorite ? (
									<IconStar className={cx("text-amber-500", props.className)} />
								) : (
									<IconStar className={props.className}></IconStar>
								)
							}
						>
							{channel.currentUser.isFavorite ? "Unfavorite" : "Favorite"}
						</Dropdown.Item>
						<Dropdown.Separator />
						<Dropdown.Item
							onAction={handleRename}
							icon={(props) => <IconEdit className={cx("text-amber-500", props.className)} />}
						>
							Rename
						</Dropdown.Item>
						<Dropdown.Item
							onAction={handleDelete}
							icon={(props) => <IconTrash className={cx("text-amber-500", props.className)} />}
						>
							Delete
						</Dropdown.Item>
						<Dropdown.Separator />
						<Dropdown.Item
							className="text-destructive"
							icon={(props) => (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className={props.className}
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" x2="9" y1="12" y2="12" />
								</svg>
							)}
							onAction={handleLeaveChannel}
						>
							Leave
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>
			<RenameChannelModal
				channelId={channelId}
				isOpen={isRenameModalOpen}
				onOpenChange={setIsRenameModalOpen}
			/>
			<DeleteChannelModal
				channelName={channel.name || "this channel"}
				isOpen={isDeleteModalOpen}
				onOpenChange={setIsDeleteModalOpen}
				onConfirm={handleConfirmDelete}
			/>
		</SidebarMenuItem>
	)
}

interface DmChannelLinkProps {
	channelId: ChannelId
	userPresence: {
		userId: string
		online: boolean
		lastDisconnected: number
	}[]
}

export const DmChannelLink = ({ channelId, userPresence }: DmChannelLinkProps) => {
	const { slug: orgSlug } = useOrganization()
	const router = useRouter()

	const { channel } = useChannelWithCurrentUser(channelId)

	const { user: me } = useAuth()

	if (!channel) {
		return null
	}

	const filteredMembers = (channel.members || []).filter((member) => member.userId !== me?.id)

	// Prefetch messages on hover for instant navigation
	const handleMouseEnter = useCallback(() => {
		router.preloadRoute({
			to: "/$orgSlug/chat/$id",
			params: { orgSlug: orgSlug || "", id: channelId },
		})
		messageCollection.preload()
	}, [router, orgSlug, channelId])

	const handleToggleMute = useCallback(() => {
		channelMemberCollection.update(channel.currentUser.id, (member) => {
			member.isMuted = !member.isMuted
		})
	}, [channel.currentUser.id])

	const handleToggleFavorite = useCallback(() => {
		channelMemberCollection.update(channel.currentUser.id, (member) => {
			member.isFavorite = !member.isFavorite
		})
	}, [channel.currentUser.id])

	const handleClose = useCallback(() => {
		channelMemberCollection.update(channel.currentUser.id, (member) => {
			member.isHidden = true
		})
	}, [channel.currentUser.id])

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild>
				<Link
					to="/$orgSlug/chat/$id"
					params={{ orgSlug: orgSlug || "", id: channelId }}
					onMouseEnter={handleMouseEnter}
				>
					<div className="-space-x-4 flex items-center justify-center">
						{channel.type === "single" && filteredMembers.length === 1 ? (
							<div className="flex items-center justify-center gap-3">
								<Avatar
									size="xs"
									src={filteredMembers[0]?.user.avatarUrl}
									alt={`${filteredMembers[0]?.user.firstName} ${filteredMembers[0]?.user.lastName}`}
									status={
										userPresence.find((p) => p.userId === filteredMembers[0]?.user.id)
											?.online
											? "online"
											: "offline"
									}
								/>

								<p
									className={cx(
										"max-w-40 truncate",
										channel.currentUser.isMuted && "opacity-60",
									)}
								>
									{`${filteredMembers[0]?.user.firstName} ${filteredMembers[0]?.user.lastName}`}
								</p>
							</div>
						) : (
							<div className="flex items-center gap-1">
								<div className="-space-x-2 flex">
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
								<p
									className={cx(
										"max-w-40 truncate",
										channel.currentUser.isMuted && "opacity-60",
									)}
								>
									{filteredMembers.map((member) => member.user.firstName).join(", ")}
								</p>
							</div>
						)}
					</div>
					{channel.currentUser.notificationCount > 0 && (
						<div className="-translate-y-1/2 absolute top-1/2 right-1 flex h-2.5 items-center justify-center rounded-lg border bg-muted p-2 text-xs transition-all duration-200 group-focus-within/menu-item:right-6 group-hover/menu-action:right-6 group-hover/menu-item:right-6 group-data-[state=open]/menu-action:right-6 [&:has(+[data-sidebar=menu-action][data-state=open])]:right-6">
							{channel.currentUser.notificationCount}
						</div>
					)}
				</Link>
			</SidebarMenuButton>

			<Dropdown.Root>
				<SidebarMenuAction
					showOnHover
					className="rounded-sm text-foreground data-[state=open]:bg-muted"
				>
					<IconDots className="text-foreground" />
					<span className="sr-only">More</span>
				</SidebarMenuAction>
				<Dropdown.Popover placement="right top" className="w-42">
					<Dropdown.Menu>
						<Dropdown.Section>
							<Dropdown.Item
								onAction={() => {
									console.log("TODO: Implement call")
								}}
								icon={IconPhone}
							>
								Call
							</Dropdown.Item>
							<Dropdown.Separator />
							<Dropdown.Item
								onAction={handleToggleMute}
								icon={channel.currentUser.isMuted ? IconVolume : IconVolumeMute}
							>
								{channel.currentUser.isMuted ? "Unmute" : "Mute"}
							</Dropdown.Item>
							<Dropdown.Item
								onAction={handleToggleFavorite}
								icon={({ className }) =>
									channel.currentUser.isFavorite ? (
										<IconStar className={cx(className, "text-amber-500")} />
									) : (
										<IconStar className={className} />
									)
								}
							>
								{channel.currentUser.isFavorite ? "Unfavorite" : "Favorite"}
							</Dropdown.Item>
							<Dropdown.Item
								className="text-destructive"
								onAction={handleClose}
								icon={IconClose}
							>
								Close
							</Dropdown.Item>
						</Dropdown.Section>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>
		</SidebarMenuItem>
	)
}
