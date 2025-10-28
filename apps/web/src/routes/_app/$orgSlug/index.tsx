import { useAtomSet } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { PhoneCall01 } from "@untitledui/icons"

import { useMemo, useState } from "react"
import { twJoin } from "tailwind-merge"
import { SectionHeader } from "~/components/application/section-headers/section-headers"
import { Avatar } from "~/components/base/avatar/avatar"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { Input } from "~/components/base/input/input"
import IconCircleDottedUser from "~/components/icons/icon-circle-dotted-user"
import IconCopy from "~/components/icons/icon-copy"

import IconDots from "~/components/icons/icon-dots"
import IconMagnifier3 from "~/components/icons/icon-magnifier-3"
import IconMsgs from "~/components/icons/icon-msgs"
import { organizationMemberCollection, userCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { findExistingDmChannel } from "~/lib/channels"
import { toastExit } from "~/lib/toast-exit"
import { createDmChannelMutation } from "~/atoms/channel-atoms"

export const Route = createFileRoute("/_app/$orgSlug/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { orgSlug } = useParams({ from: "/_app/$orgSlug" })
	const { organizationId } = useOrganization()
	const navigate = useNavigate()
	const [searchQuery, setSearchQuery] = useState("")

	const createDmChannel = useAtomSet(createDmChannelMutation, {
		mode: "promiseExit",
	})

	const { data: membersData } = useLiveQuery(
		(q) =>
			q
				.from({ member: organizationMemberCollection })
				.innerJoin({ user: userCollection }, ({ member, user }) => eq(member.userId, user.id))
				.where(({ member }) => eq(member.organizationId, organizationId))
				.select(({ member, user }) => ({
					...user,
					role: member.role,
					joinedAt: member.joinedAt,
				})),
		[organizationId],
	)

	const { user } = useAuth()

	const filteredMembers = useMemo(() => {
		if (!membersData || !searchQuery) return membersData || []

		return membersData.filter((member: any) => {
			const searchLower = searchQuery.toLowerCase()
			const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
			const email = member.email?.toLowerCase() || ""
			return fullName.includes(searchLower) || email.includes(searchLower)
		})
	}, [membersData, searchQuery])

	const handleOpenChat = async (targetUserId: string, targetUserName: string) => {
		if (!targetUserId || !user?.id || !organizationId) return

		// Check if a DM channel already exists
		const existingChannel = findExistingDmChannel(user.id, targetUserId)

		if (existingChannel) {
			// Navigate to existing channel
			navigate({
				to: "/$orgSlug/chat/$id",
				params: { orgSlug, id: existingChannel.id },
			})
		} else {
			// Create new DM channel
			await toastExit(
				createDmChannel({
					payload: {
						organizationId,
						participantIds: [targetUserId as UserId],
						type: "single",
					},
				}),
				{
					loading: `Starting conversation with ${targetUserName}...`,
					success: (result) => {
						// Navigate to the created channel
						if (result.data.id) {
							navigate({
								to: "/$orgSlug/chat/$id",
								params: { orgSlug, id: result.data.id },
							})
						}

						return `Started conversation with ${targetUserName}`
					},
				},
			)
		}
	}

	return (
		<div className="flex flex-col gap-6 p-6 lg:p-12">
			<SectionHeader.Root>
				<SectionHeader.Group>
					<div className="space-y-0.5">
						<SectionHeader.Heading>Members</SectionHeader.Heading>
						<SectionHeader.Subheading>
							Explore your organization and connect with fellow members.
						</SectionHeader.Subheading>
					</div>
				</SectionHeader.Group>
			</SectionHeader.Root>

			<div className="w-full">
				<Input
					autoFocus
					value={searchQuery}
					onChange={(value) => setSearchQuery(value)}
					placeholder="Search members..."
					className="w-full"
					icon={IconMagnifier3}
					iconClassName="size-5 text-secondary"
				/>
			</div>

			<div className="w-full space-y-2">
				{!membersData ? (
					<div className="flex items-center justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
					</div>
				) : filteredMembers.length === 0 ? (
					<div className="py-8 text-center text-secondary">
						{searchQuery
							? "No members found matching your search"
							: "No members in this organization"}
					</div>
				) : (
					filteredMembers.map((member) => {
						const fullName = `${member.firstName} ${member.lastName}`.trim()
						const isCurrentUser = user && user.id === member.id
						return (
							<div
								key={member.id}
								className={twJoin(
									"flex items-center justify-between gap-4 rounded-lg px-3 py-2",

									!isCurrentUser &&
										"group inset-ring inset-ring-transparent hover:inset-ring-secondary hover:bg-quaternary/40",
								)}
							>
								<div className="flex items-center gap-2 sm:gap-2.5">
									<Avatar src={member.avatarUrl} alt={fullName || "User"} size="sm" />
									<div>
										<div className="flex items-center font-semibold text-sm/6">
											{fullName || "Unknown User"}
											<span className="mx-2 text-tertiary">&middot;</span>
											{member.role && (
												<span className="text-tertiary text-xs capitalize">
													{member.role}{" "}
													{member.role === "admin" && (
														<span className="ml-1">👑</span>
													)}
												</span>
											)}
										</div>
										<p className="text-tertiary text-xs">{member.email}</p>
									</div>
								</div>

								{!isCurrentUser && (
									<div className="flex items-center gap-2">
										<ButtonUtility
											onClick={() => handleOpenChat(member.id, fullName)}
											className="inset-ring-0 hidden pressed:bg-tertiary group-hover:bg-tertiary sm:inline-grid"
											size="sm"
											icon={IconMsgs}
										/>
										<Dropdown.Root>
											<ButtonUtility
												className="inset-ring-0 pressed:bg-tertiary group-hover:bg-tertiary"
												size="sm"
												icon={IconDots}
											/>
											<Dropdown.Popover>
												<Dropdown.Menu
													onAction={(key) => {
														if (key === "message") {
															handleOpenChat(member.id, fullName)
														}
													}}
												>
													<Dropdown.Section>
														<Dropdown.Item id="message" icon={IconMsgs}>
															Message
														</Dropdown.Item>
														<Dropdown.Item icon={IconCircleDottedUser}>
															View profile
														</Dropdown.Item>
														<Dropdown.Item icon={PhoneCall01}>
															Start call
														</Dropdown.Item>
														<Dropdown.Item icon={IconCopy}>
															Copy email
														</Dropdown.Item>
													</Dropdown.Section>
												</Dropdown.Menu>
											</Dropdown.Popover>
										</Dropdown.Root>
									</div>
								)}
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}
