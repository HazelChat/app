import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@workos-inc/authkit-react"
import { useMemo, useState } from "react"
import { Avatar } from "~/components/base/avatar/avatar"
import { Button } from "~/components/base/buttons/button"
import { Input } from "~/components/base/input/input"
import { IconChatStroke } from "~/components/icons/IconChatStroke"
import { IconSearchStroke } from "~/components/icons/IconSearchStroke"
import { IconThreeDotsMenuHorizontalStroke } from "~/components/icons/IconThreeDotsMenuHorizontalStroke"

export const Route = createFileRoute("/app/")({
	component: RouteComponent,
})

function RouteComponent() {
	const { organizationId } = useAuth()
	const navigate = useNavigate()
	const [searchQuery, setSearchQuery] = useState("")

	// Fetch members from the organization
	const membersQuery = useQuery(
		convexQuery(api.social.getMembersForOrganization, organizationId ? {} : "skip"),
	)

	// Get current user data
	const currentUserQuery = useQuery(convexQuery(api.me.get, organizationId ? {} : "skip"))

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
			const channelId = await createDmChannel({ userId: targetUserId })
			await navigate({ to: "/app/chat/$id", params: { id: channelId } })
		} catch (error) {
			console.error("Failed to create DM channel:", error)
		}
	}

	if (!organizationId) {
		return <div className="flex h-full items-center justify-center">No organization selected</div>
	}

	return (
		<div className="container mx-auto px-6 py-12">
			<div className="flex flex-col gap-6">
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
									className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/40"
								>
									<div className="flex items-center gap-3">
										<Avatar src={member.avatarUrl} alt={fullName || "User"} size="md" />
										<div>
											<p className="font-medium">{fullName || "Unknown User"}</p>
											<p className="text-secondary text-sm">{member.email}</p>
											{member.role && (
												<p className="text-brand-primary text-xs capitalize">
													{member.role}
												</p>
											)}
										</div>
									</div>

									{currentUserQuery.data?._id !== member._id && (
										<div className="flex items-center gap-2">
											<Button
												color="tertiary"
												size="sm"
												onClick={() => handleOpenChat(member._id)}
												className="p-2"
											>
												<IconChatStroke className="size-5" />
											</Button>
											<Button color="tertiary" size="sm" className="p-2">
												<IconThreeDotsMenuHorizontalStroke className="size-5" />
											</Button>
										</div>
									)}
								</div>
							)
						})
					)}
				</div>
			</div>
		</div>
	)
}
