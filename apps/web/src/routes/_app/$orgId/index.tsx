import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { PhoneCall01, SwitchHorizontal02, UserDown01, UserX01, VolumeX } from "@untitledui/icons"
import { useMemo, useState } from "react"
import { Avatar } from "~/components/base/avatar/avatar"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { Input } from "~/components/base/input/input"
import { IconChatStroke } from "~/components/icons/IconChatStroke"
import { IconSearchStroke } from "~/components/icons/IconSearchStroke"
import { IconThreeDotsMenuHorizontalStroke } from "~/components/icons/IconThreeDotsMenuHorizontalStroke"
import IconPlusStroke from "~/components/icons/IconPlusStroke";
import IconUserUser03 from "~/components/icons/IconUserUser03";
import IconAlertCircle from "~/components/icons/IconAlertCircle";
import IconClipboard from "~/components/icons/IconClipboard";
import { twJoin } from "tailwind-merge"
import { ButtonUtility } from "~/components/base/buttons/button-utility";

export const Route = createFileRoute("/_app/$orgId/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const organizationId = orgId as Id<"organizations">
	const navigate = useNavigate()
	const [searchQuery, setSearchQuery] = useState("")

	// Fetch members from the organization
	const membersQuery = useQuery(convexQuery(api.social.getMembersForOrganization, { organizationId }))

	// Get current user data
	const currentUserQuery = useQuery(convexQuery(api.me.get, {}))

	// Mutation to create DM channel
	const createDmChannel = useConvexMutation(api.channels.createDmChannel)

	// Filter members based on search query
	const filteredMembers = useMemo(() => {
		if (!membersQuery.data || !searchQuery) return membersQuery.data || []

		return membersQuery.data.filter((member: any) => {
			const searchLower = searchQuery.toLowerCase()
			const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
			const email = member.email?.toLowerCase() || ""
			return fullName.includes(searchLower) || email.includes(searchLower)
		})
	}, [membersQuery.data, searchQuery])

	const handleOpenChat = async (targetUserId: Id<"users">) => {
		if (!targetUserId) return

		try {
			const channelId = await createDmChannel({ organizationId, userId: targetUserId })
			await navigate({ to: "/$orgId/chat/$id", params: { orgId, id: channelId } })
		} catch (error) {
			console.error("Failed to create DM channel:", error)
		}
	}

	return (
			<div className="flex flex-col sm:py-4 p-4 gap-6">
				<div className="w-full">
					<h1 className="mb-2 font-semibold text-2xl">Members</h1>
					<p className="text-secondary">Browse and connect with members in your organization</p>
				</div>

				<div className="w-full">
					<Input
						autoFocus
						value={searchQuery}
						onChange={(value) => setSearchQuery(value)}
						placeholder="Search members..."
						className="w-full"
						icon={IconSearchStroke}
						iconClassName="size-5 text-secondary"
					/>
				</div>

				<div className="w-full space-y-2">
					{membersQuery.isLoading ? (
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
						filteredMembers.map((member: any) => {
							const fullName = `${member.firstName} ${member.lastName}`.trim()
							return (
								<div
									key={member._id}
									className={twJoin(
                    "flex items-center justify-between gap-4 rounded-lg px-3 py-2",

                  currentUserQuery.data?._id !== member._id && "group hover:bg-tertiary/40 transition-colors"
                  )}
								>
									<div className="flex items-center gap-2 sm:gap-2.5">
										<Avatar src={member.avatarUrl} alt={fullName || "User"} size="sm" />
										<div>
											<p className="font-semibold flex items-center text-sm/6">{fullName || "Unknown User"}
                        <span className="mx-2 text-tertiary">&middot;</span>
                        {member.role && (
                        <p className="text-tertiary text-xs capitalize">
                          {member.role} {member.role === 'admin' && <span className='ml-1'>👑</span>}
                        </p>
                      )}</p>
											<p className="text-tertiary text-xs">{member.email}</p>

										</div>
									</div>

									{currentUserQuery.data?._id !== member._id && (
										<div className="flex items-center gap-2">
											<ButtonUtility
												onClick={() => handleOpenChat(member._id)}
												className="sm:inline-grid hidden inset-ring-0 group-hover:bg-tertiary pressed:bg-tertiary"
                        size='sm'
                        icon={IconChatStroke}
											/>
                      <Dropdown.Root>
                        <ButtonUtility className='inset-ring-0 group-hover:bg-tertiary pressed:bg-tertiary' size="sm" icon={IconThreeDotsMenuHorizontalStroke}/>
                        <Dropdown.Popover>
                          <Dropdown.Menu>
                            <Dropdown.Section>
                              <Dropdown.Item icon={IconChatStroke}>Message</Dropdown.Item>
                              <Dropdown.Item icon={IconUserUser03}>View profile</Dropdown.Item>
                              <Dropdown.Item icon={PhoneCall01}>Start call</Dropdown.Item>
                              <Dropdown.Item icon={IconClipboard}>Copy email</Dropdown.Item>
                            </Dropdown.Section>
                            <Dropdown.Separator />
                            <Dropdown.Section>
                              <Dropdown.Item icon={IconPlusStroke}>Add to channel</Dropdown.Item>
                              <Dropdown.Item icon={SwitchHorizontal02}>Change role</Dropdown.Item>
                              <Dropdown.Item icon={VolumeX}>Mute user</Dropdown.Item>
                              <Dropdown.Item icon={UserDown01}>Kick</Dropdown.Item>
                              <Dropdown.Item icon={UserX01}>Ban</Dropdown.Item>
                              <Dropdown.Item icon={IconAlertCircle}>Report</Dropdown.Item>
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
