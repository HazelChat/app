"use client"

import type { OrganizationId } from "@hazel/db/schema"
import {
	AdjustmentsHorizontalIcon,
	CalendarDaysIcon,
	ChevronUpDownIcon,
	Cog6ToothIcon,
	FaceSmileIcon,
	FolderPlusIcon,
	MagnifyingGlassIcon,
	PlusCircleIcon,
	PlusIcon,
	ShieldCheckIcon,
	UserGroupIcon,
	UserPlusIcon,
	UsersIcon,
	WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid"
import { and, eq, or, useLiveQuery } from "@tanstack/react-db"
import { useMemo, useState } from "react"
import { Button as PrimitiveButton } from "react-aria-components"
import { CreateChannelModal } from "~/components/modals/create-channel-modal"
import { SwitchServerMenu } from "~/components/sidebar/switch-server-menu"
import { UserMenu } from "~/components/sidebar/user-menu"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Keyboard } from "~/components/ui/keyboard"
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuSubMenu,
} from "~/components/ui/menu"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarSection,
	SidebarSectionGroup,
	useSidebar,
} from "~/components/ui/sidebar"
import { Strong } from "~/components/ui/text"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import IconHashtag from "../icons/icon-hashtag"

const ChannelGroup = (props: { organizationId: OrganizationId; onCreateChannel: () => void }) => {
	const { user } = useAuth()
	const { slug } = useOrganization()

	const { data: userChannels } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, props.organizationId),
						or(eq(q.channel.type, "public"), eq(q.channel.type, "private")),
						eq(q.member.userId, user?.id || ""),
						eq(q.member.isHidden, false),
						eq(q.member.isFavorite, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[user?.id, props.organizationId],
	)

	const channels = useMemo(() => {
		if (!userChannels) return []
		return userChannels.map((row) => row.channel)
	}, [userChannels])

	if (!slug) return null

	return (
		<SidebarSection>
			<div className="col-span-full flex items-center justify-between gap-x-2 pl-2.5 text-muted-fg text-xs/5">
				<Strong>Channels</Strong>
				<Button intent="plain" isCircle size="sq-sm" onPress={props.onCreateChannel}>
					<PlusIcon />
				</Button>
			</div>
			{channels.map((channel) => (
				<SidebarItem
					key={channel.id}
					href={`/${slug}/chat/${channel.id}` as "/"}
					tooltip={channel.name}
				>
					<IconHashtag />
					<SidebarLabel>{channel.name}</SidebarLabel>
				</SidebarItem>
			))}
		</SidebarSection>
	)
}

const DmChannelGroup = (props: { organizationId: OrganizationId }) => {
	const { user } = useAuth()

	const { data: userDmChannels } = useLiveQuery(
		(q) =>
			q
				.from({ channel: channelCollection })
				.innerJoin({ member: channelMemberCollection }, ({ channel, member }) =>
					eq(member.channelId, channel.id),
				)
				.where((q) =>
					and(
						eq(q.channel.organizationId, props.organizationId),
						or(eq(q.channel.type, "direct"), eq(q.channel.type, "single")),
						eq(q.member.userId, user?.id || ""),
						eq(q.member.isHidden, false),
						eq(q.member.isFavorite, false),
					),
				)
				.orderBy(({ channel }) => channel.createdAt, "asc"),
		[user?.id, props.organizationId],
	)

	const dmChannels = useMemo(() => {
		if (!userDmChannels) return []
		return userDmChannels.map((row) => row.channel)
	}, [userDmChannels])

	return (
		<SidebarSection>
			<div className="col-span-full flex items-center justify-between gap-x-2 pl-2.5 text-muted-fg text-xs/5">
				<Strong>Direct Messages</Strong>
				<Button intent="plain" isCircle size="sq-sm">
					<PlusIcon />
				</Button>
			</div>
			{dmChannels.map((channel) => (
				<SidebarItem key={channel.id} href={`/`} tooltip={channel.name}>
					<IconHashtag />
					<SidebarLabel>{channel.name}</SidebarLabel>
				</SidebarItem>
			))}
		</SidebarSection>
	)
}

export function ChannelsSidebar() {
	const { isMobile } = useSidebar()
	const { organizationId, organization } = useOrganization()
	const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)

	return (
		<>
			<Sidebar collapsible="none" className="flex flex-1">
				<SidebarHeader className="border-b py-4">
					<Menu>
						<PrimitiveButton className="relative flex items-center justify-between gap-x-2 font-semibold outline-hidden focus-visible:ring focus-visible:ring-primary">
							<div className="flex w-full items-center gap-1">
								<span className="flex gap-x-2 font-medium text-sm/6">
									<Avatar
										isSquare
										size="sm"
										src={
											organization?.logoUrl || `https://avatar.vercel.sh/${organizationId}`
										}
									/>
									{organization?.name}
								</span>
								<ChevronUpDownIcon className="ml-auto size-4 text-muted-fg" />
							</div>
						</PrimitiveButton>
						<MenuContent className="min-w-(--trigger-width)">
							{isMobile ? (
								<SwitchServerMenu />
							) : (
								<>
									<MenuSection>
										<MenuItem href="/">
											<UserPlusIcon />
											<MenuLabel>Invite people</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<UserGroupIcon />
											<MenuLabel>Manage members</MenuLabel>
										</MenuItem>
									</MenuSection>

									<MenuSubMenu>
										<MenuItem>
											<UserGroupIcon />
											<MenuLabel>Switch Server</MenuLabel>
										</MenuItem>
										<MenuContent>
											<SwitchServerMenu />
										</MenuContent>
									</MenuSubMenu>

									<MenuSeparator />

									<MenuSection>
										<MenuItem onAction={() => setShowCreateChannelModal(true)}>
											<PlusCircleIcon />
											<MenuLabel>Create channel</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<FolderPlusIcon />
											<MenuLabel>Create category</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<CalendarDaysIcon />
											<MenuLabel>Create event</MenuLabel>
										</MenuItem>
									</MenuSection>

									<MenuSeparator />

									<MenuSection>
										<MenuItem href="/">
											<Cog6ToothIcon />
											<MenuLabel>Server settings</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<ShieldCheckIcon />
											<MenuLabel>Roles & permissions</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<AdjustmentsHorizontalIcon />
											<MenuLabel>Notification settings</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<FaceSmileIcon />
											<MenuLabel>Custom emojis</MenuLabel>
										</MenuItem>
										<MenuItem href="/">
											<WrenchScrewdriverIcon />
											<MenuLabel>Integrations</MenuLabel>
										</MenuItem>
									</MenuSection>
								</>
							)}
						</MenuContent>
					</Menu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarSectionGroup>
						<SidebarSection aria-label="Goto">
							<SidebarItem href="/">
								<CalendarDaysIcon />
								<SidebarLabel>Events</SidebarLabel>
							</SidebarItem>
							<SidebarItem>
								<MagnifyingGlassIcon />
								<SidebarLabel>Browse channels</SidebarLabel>
								<Keyboard className="-translate-y-1/2 absolute top-1/2 right-2 font-mono text-muted-fg text-xs">
									⌘K
								</Keyboard>
							</SidebarItem>
							<SidebarItem href="/">
								<UsersIcon />
								<SidebarLabel>Members</SidebarLabel>
							</SidebarItem>
						</SidebarSection>

						{organizationId && (
							<>
								<ChannelGroup
									organizationId={organizationId}
									onCreateChannel={() => setShowCreateChannelModal(true)}
								/>
								<DmChannelGroup organizationId={organizationId} />
							</>
						)}
					</SidebarSectionGroup>
				</SidebarContent>
				<SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
					<UserMenu />
				</SidebarFooter>
			</Sidebar>

			<CreateChannelModal
				isOpen={showCreateChannelModal}
				onOpenChange={setShowCreateChannelModal}
			/>
		</>
	)
}
