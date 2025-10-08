"use client"

import { useAtomSet } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/db/schema"
import { and, eq, or, useLiveQuery } from "@tanstack/react-db"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
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
import { findExistingDmChannel } from "~/lib/channels"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { toastExit } from "~/lib/toast-exit"
import { useAuth } from "~/providers/auth-provider"
import { Avatar } from "./base/avatar/avatar"

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
	const [currentPage, setCurrentPage] = useState<Page>("home")
	const [pageHistory, setPageHistory] = useState<Page[]>([])
	const [inputValue, setInputValue] = useState("")

	const navigateToPage = useCallback(
		(page: Page) => {
			setPageHistory((prev) => [...prev, currentPage])
			setCurrentPage(page)
			setInputValue("") // Reset search when navigating
		},
		[currentPage],
	)

	const goBack = useCallback(() => {
		if (pageHistory.length > 0) {
			const previousPage = pageHistory[pageHistory.length - 1]
			setPageHistory((prev) => prev.slice(0, -1))
			if (previousPage) {
				setCurrentPage(previousPage)
				setInputValue("") // Reset search when going back
			}
		}
	}, [pageHistory])

	const closePalette = useCallback(() => {
		props.onOpenChange?.(false)
	}, [props])

	// Reset to home when modal closes/opens
	useEffect(() => {
		if (!props.isOpen) {
			setCurrentPage("home")
			setPageHistory([])
			setInputValue("")
		} else {
			// Ensure search input gets focus when modal opens
			setTimeout(() => {
				const searchInput = document.querySelector('[role="dialog"] input') as HTMLInputElement
				if (searchInput) {
					searchInput.focus()
				}
			}, 100)
		}
	}, [props.isOpen])

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
			onInputChange={setInputValue}
			{...props}
		>
			<CommandMenuSearch placeholder={searchPlaceholder} />
			<CommandMenuList>
				{currentPage === "home" && <HomeView navigateToPage={navigateToPage} />}
				{currentPage === "channels" && <ChannelsView onClose={closePalette} />}
				{currentPage === "members" && <MembersView onClose={closePalette} />}
			</CommandMenuList>
		</CommandMenu>
	)
}

function HomeView({ navigateToPage }: { navigateToPage: (page: Page) => void }) {
	const { slug: orgSlug } = useOrganization()

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
				<CommandMenuItem href={`/${orgSlug}/notifications`} textValue="notifications">
					<IconBell />
					<CommandMenuLabel>Notifications</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/call`} textValue="calls">
					<IconPhone />
					<CommandMenuLabel>Calls</CommandMenuLabel>
				</CommandMenuItem>
			</CommandMenuSection>

			<CommandMenuSection label="Settings">
				<CommandMenuItem href={`/${orgSlug}/settings`} textValue="general settings">
					<IconGear />
					<CommandMenuLabel>General Settings</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/settings/profile`} textValue="profile">
					<IconCircleDottedUser />
					<CommandMenuLabel>Profile</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/settings/team`} textValue="team">
					<IconDashboard />
					<CommandMenuLabel>Team</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/settings/billing`} textValue="billing">
					<IconDashboard />
					<CommandMenuLabel>Billing</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/settings/email`} textValue="email">
					<IconEnvelope />
					<CommandMenuLabel>Email</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/settings/integrations`} textValue="integrations">
					<IconIntegration />
					<CommandMenuLabel>Integrations</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem href={`/${orgSlug}/settings/invitations`} textValue="invitations">
					<IconUsersPlus />
					<CommandMenuLabel>Invitations</CommandMenuLabel>
				</CommandMenuItem>
				<CommandMenuItem
					href={`/${orgSlug}/settings/notifications`}
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
					href={`/${orgSlug}/chat/${channel.id}`}
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

	const createDmChannel = useAtomSet(HazelApiClient.mutation("channels", "createDm"), {
		mode: "promiseExit",
	})

	const { data: members } = useLiveQuery(
		(q) =>
			organizationId
				? q
						.from({ member: organizationMemberCollection })
						.innerJoin({ user: userCollection }, ({ member, user }) => eq(member.userId, user.id))
						.leftJoin({ presence: userPresenceStatusCollection }, ({ user, presence }) => eq(user.id, presence.userId))
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
				const isOnline = presence?.status === "online" || presence?.status === "away" || presence?.status === "busy" || presence?.status === "dnd"
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
						<Avatar size="xs" className="mr-1" src={user.avatarUrl} alt={fullName} status={isOnline ? "online" : "offline"} />
						<CommandMenuLabel>{fullName}</CommandMenuLabel>
						{presence?.customMessage && (
							<span className="ml-auto text-tertiary text-xs truncate">{presence.customMessage}</span>
						)}
					</CommandMenuItem>
				)
			})}
		</CommandMenuSection>
	)
}
