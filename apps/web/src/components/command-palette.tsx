"use client"

import { useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/db/schema"
import { and, eq, or, useLiveQuery } from "@tanstack/react-db"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo } from "react"
import { type CommandPalettePage, commandPaletteAtom } from "~/atoms/command-palette-atoms"
import {
	CommandMenu,
	CommandMenuItem,
	CommandMenuLabel,
	CommandMenuList,
	type CommandMenuProps,
	CommandMenuSearch,
	CommandMenuSection,
} from "~/components/ui/command-menu"
import {
	channelCollection,
	channelMemberCollection,
	organizationMemberCollection,
	userCollection,
	userPresenceStatusCollection,
} from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { findExistingDmChannel } from "~/lib/channels"
import { toastExit } from "~/lib/toast-exit"
import { Avatar } from "./base/avatar/avatar"
import { createDmChannelMutation } from "~/atoms/channel-atoms"

import IconBell from "./icons/icon-bell"
import IconCircleDottedUser from "./icons/icon-circle-dotted-user"
import IconDashboard from "./icons/icon-dashboard"
import IconEnvelope from "./icons/icon-envelope"
import IconGear from "./icons/icon-gear"
import IconHashtag from "./icons/icon-hashtag"
import IconIntegration from "./icons/icon-integratio-"
import IconMsgs from "./icons/icon-msgs"
import IconPhone from "./icons/icon-phone"
import IconUsersPlus from "./icons/icon-users-plus"

type Page = "home" | "channels" | "members"

export function CommandPalette(props: Pick<CommandMenuProps, "isOpen" | "onOpenChange">) {
	// Use atoms for state management with hook-based updates
	const { currentPage, inputValue } = useAtomValue(commandPaletteAtom)
	const setCommandPaletteState = useAtomSet(commandPaletteAtom)

	const navigateToPage = useCallback(
		(page: Page) => {
			setCommandPaletteState((state) => ({
				...state,
				currentPage: page,
				pageHistory: [...state.pageHistory, state.currentPage],
				inputValue: "",
			}))
		},
		[setCommandPaletteState],
	)

	const goBack = useCallback(() => {
		setCommandPaletteState((state) => {
			if (state.pageHistory.length === 0) return state

			const previousPage = state.pageHistory[state.pageHistory.length - 1]
			return {
				...state,
				currentPage: previousPage || "home",
				pageHistory: state.pageHistory.slice(0, -1),
				inputValue: "",
			}
		})
	}, [setCommandPaletteState])

	const updateSearchInput = useCallback(
		(value: string) => {
			setCommandPaletteState((state) => ({
				...state,
				inputValue: value,
			}))
		},
		[setCommandPaletteState],
	)

	const closePalette = useCallback(() => {
		props.onOpenChange?.(false)
	}, [props])

	// Reset navigation to home page when modal opens
	// Keep state when closing so it's preserved if reopened quickly
	useEffect(() => {
		if (props.isOpen) {
			// Reset to home page when opening
			setCommandPaletteState({
				currentPage: "home",
				pageHistory: [],
				inputValue: "",
			})

			// Ensure search input gets focus when modal opens
			setTimeout(() => {
				const searchInput = document.querySelector('[role="dialog"] input') as HTMLInputElement
				if (searchInput) {
					searchInput.focus()
				}
			}, 100)
		}
	}, [props.isOpen, setCommandPaletteState])

	// Handle ESC key to go back
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && currentPage !== "home" && props.isOpen) {
				e.preventDefault()
				e.stopPropagation()
				goBack()
			}
		}

		document.addEventListener("keydown", handleKeyDown, { capture: true })
		return () => document.removeEventListener("keydown", handleKeyDown, { capture: true })
	}, [currentPage, goBack, props.isOpen])

	const searchPlaceholder = useMemo(() => {
		switch (currentPage) {
			case "channels":
				return "Search channels..."
			case "members":
				return "Search members..."
			default:
				return "Where would you like to go?"
		}
	}, [currentPage])

	return (
		<CommandMenu
			key={currentPage}
			shortcut="k"
			inputValue={inputValue}
			onInputChange={updateSearchInput}
			{...props}
		>
			<CommandMenuSearch placeholder={searchPlaceholder} />
			<CommandMenuList>
				{currentPage === "home" && (
					<HomeView navigateToPage={navigateToPage} onClose={closePalette} />
				)}
				{currentPage === "channels" && <ChannelsView onClose={closePalette} />}
				{currentPage === "members" && <MembersView onClose={closePalette} />}
			</CommandMenuList>
		</CommandMenu>
	)
}

function HomeView({
	navigateToPage,
	onClose,
}: {
	navigateToPage: (page: Page) => void
	onClose: () => void
}) {
	const { slug: orgSlug } = useOrganization()
	const navigate = useNavigate()

	return (
		<>
			<CommandMenuSection>
				<CommandMenuItem onAction={() => navigateToPage("channels")} textValue="browse channels">
					<IconMsgs />
					<CommandMenuLabel>Browse channels...</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem onAction={() => navigateToPage("members")} textValue="browse members">
					<IconUsersPlus />
					<CommandMenuLabel>Browse members...</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/notifications", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="notifications"
				>
					<IconBell />
					<CommandMenuLabel>Notifications</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/call", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="calls"
				>
					<IconPhone />
					<CommandMenuLabel>Calls</CommandMenuLabel>
				</CommandMenuItem>
			</CommandMenuSection>

			<CommandMenuSection label="Settings">
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="general settings"
				>
					<IconGear />
					<CommandMenuLabel>General Settings</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings/profile", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="profile"
				>
					<IconCircleDottedUser />
					<CommandMenuLabel>Profile</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings/team", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="team"
				>
					<IconDashboard />
					<CommandMenuLabel>Team</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings/billing", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="billing"
				>
					<IconDashboard />
					<CommandMenuLabel>Billing</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings/email", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="email"
				>
					<IconEnvelope />
					<CommandMenuLabel>Email</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings/integrations", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="integrations"
				>
					<IconIntegration />
					<CommandMenuLabel>Integrations</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({ to: "/$orgSlug/settings/invitations", params: { orgSlug: orgSlug! } })
						onClose()
					}}
					textValue="invitations"
				>
					<IconUsersPlus />
					<CommandMenuLabel>Invitations</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					onAction={() => {
						navigate({
							to: "/$orgSlug/settings/notifications",
							params: { orgSlug: orgSlug! },
						})
						onClose()
					}}
					textValue="notification settings"
				>
					<IconBell />
					<CommandMenuLabel>Notification Settings</CommandMenuLabel>
				</CommandMenuItem>
			</CommandMenuSection>
		</>
	)
}

function ChannelsView({ onClose }: { onClose: () => void }) {
	const { organizationId, slug: orgSlug } = useOrganization()
	const { user } = useAuth()
	const navigate = useNavigate()

	const { data: userChannels } = useLiveQuery(
		(q) =>
			organizationId && user?.id
				? q
						.from({ channel: channelCollection })
						.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
							eq(member.channelId, channel.id),
						)
						.where((q) =>
							and(
								eq(q.channel.organizationId, organizationId),
								or(eq(q.channel.type, "public"), eq(q.channel.type, "private")),
								eq(q.member.userId, user.id),
								eq(q.member.isHidden, false),
							),
						)
						.orderBy(({ channel }) => channel.name, "asc")
				: null,
		[organizationId, user?.id],
	)

	return (
		<CommandMenuSection>
			{userChannels?.map(({ channel }) => (
				<CommandMenuItem
					key={channel.id}
					textValue={channel.name}
					onAction={() => {
						navigate({ to: "/$orgSlug/chat/$id", params: { orgSlug: orgSlug!, id: channel.id } })
						onClose()
					}}
				>
					<IconHashtag />
					<CommandMenuLabel>{channel.name}</CommandMenuLabel>
				</CommandMenuItem>
			))}
		</CommandMenuSection>
	)
}

function MembersView({ onClose }: { onClose: () => void }) {
	const { organizationId, slug: orgSlug } = useOrganization()
	const { user: currentUser } = useAuth()
	const navigate = useNavigate()

	const createDmChannel = useAtomSet(createDmChannelMutation, {
		mode: "promiseExit",
	})

	const { data: members } = useLiveQuery(
		(q) =>
			organizationId
				? q
						.from({ member: organizationMemberCollection })
						.innerJoin({ user: userCollection }, ({ member, user }) => eq(member.userId, user.id))
						.leftJoin({ presence: userPresenceStatusCollection }, ({ user, presence }) =>
							eq(user.id, presence.userId),
						)
						.where((q) => eq(q.member.organizationId, organizationId))
						.orderBy(({ user }) => user.firstName, "asc")
						.select(({ member, user, presence }) => ({ member, user, presence }))
				: null,
		[organizationId],
	)

	const filteredMembers = useMemo(() => {
		return members?.filter(({ user }) => user.id !== currentUser?.id) || []
	}, [members, currentUser?.id])

	return (
		<CommandMenuSection>
			{filteredMembers.map(({ user, presence }) => {
				const fullName = `${user.firstName} ${user.lastName}`
				const isOnline =
					presence?.status === "online" ||
					presence?.status === "away" ||
					presence?.status === "busy" ||
					presence?.status === "dnd"
				return (
					<CommandMenuItem
						key={user.id}
						textValue={fullName}
						onAction={async () => {
							if (!currentUser?.id) return

							// Check if a DM channel already exists
							const existingChannel = findExistingDmChannel(currentUser.id, user.id)

							if (existingChannel) {
								// Navigate to existing channel
								navigate({
									to: "/$orgSlug/chat/$id",
									params: { orgSlug: orgSlug!, id: existingChannel.id },
								})
								onClose()
							} else {
								// Create new DM channel
								if (!organizationId || !orgSlug) return

								await toastExit(
									createDmChannel({
										payload: {
											organizationId,
											participantIds: [user.id as UserId],
											type: "single",
										},
									}),
									{
										loading: `Starting conversation with ${user.firstName}...`,
										success: (result) => {
											// Navigate to the created channel
											if (result.data.id) {
												navigate({
													to: "/$orgSlug/chat/$id",
													params: { orgSlug, id: result.data.id },
												})
											}

											onClose()
											return `Started conversation with ${user.firstName}`
										},
									},
								)
							}
						}}
					>
						<Avatar
							size="xs"
							className="mr-1"
							src={user.avatarUrl}
							alt={fullName}
							status={isOnline ? "online" : "offline"}
						/>
						<CommandMenuLabel>{fullName}</CommandMenuLabel>
						{presence?.customMessage && (
							<span className="ml-auto truncate text-tertiary text-xs">
								{presence.customMessage}
							</span>
						)}
					</CommandMenuItem>
				)
			})}
		</CommandMenuSection>
	)
}
