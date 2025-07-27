import { useConvexMutation, useConvexQuery } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { createFileRoute } from "@tanstack/react-router"
import { Form } from "~/components/base/form/form"

import "@workos-inc/widgets/styles.css"

import type { Id } from "@hazel/backend"
import { Edit01, Plus, RefreshCcw02, Trash01, XClose } from "@untitledui/icons"
import { useState } from "react"
import type { SortDescriptor } from "react-aria-components"
import { toast } from "sonner"
import { EmailInviteModal } from "~/components/application/modals/email-invite-modal"
import { PaginationCardDefault } from "~/components/application/pagination/pagination"
import { Table, TableCard } from "~/components/application/table/table"
import { Avatar } from "~/components/base/avatar/avatar"
import { Badge, type BadgeColor, BadgeWithDot } from "~/components/base/badges/badges"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"

export const Route = createFileRoute("/app/settings/team")({
	component: RouteComponent,
})

function RouteComponent() {
	const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
		column: "status",
		direction: "ascending",
	})
	const [invitationsSortDescriptor, setInvitationsSortDescriptor] = useState<SortDescriptor>({
		column: "email",
		direction: "ascending",
	})
	const [showInviteModal, setShowInviteModal] = useState(false)

	const teamMembersQuery = useConvexQuery(api.users.getUsers, {})
	const invitationsQuery = useConvexQuery(api.invitations.getInvitations, {})
	const resendInvitationMutation = useConvexMutation(api.invitations.resendInvitation)
	const revokeInvitationMutation = useConvexMutation(api.invitations.revokeInvitation)

	const isLoading = teamMembersQuery === undefined
	const isInvitationsLoading = invitationsQuery === undefined

	const teamMembers =
		teamMembersQuery?.map((user) => ({
			id: user._id,
			name: `${user.firstName} ${user.lastName}`,
			email: user.email,
			avatarUrl: user.avatarUrl,
			status: user.status === "online" ? "Active" : "Offline",
			role: user.role,
		})) || []

	const pendingInvitations = invitationsQuery?.filter((inv) => !inv.isExpired) || []

	const roleToBadgeColorsMap: Record<string, BadgeColor<"pill-color">> = {
		owner: "brand",
		admin: "pink",
		member: "gray",
	}

	const getInitials = (name: string) => {
		const [firstName, lastName] = name.split(" ")
		return `${firstName.charAt(0)}${lastName.charAt(0)}`
	}

	const formatTimeRemaining = (milliseconds: number) => {
		if (milliseconds <= 0) return "Expired"

		const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
		const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

		if (days > 0) {
			return `Expires in ${days} day${days > 1 ? "s" : ""}`
		}
		if (hours > 0) {
			return `Expires in ${hours} hour${hours > 1 ? "s" : ""}`
		}
		return "Expires soon"
	}

	const handleResendInvitation = async (invitationId: Id<"invitations">) => {
		try {
			await resendInvitationMutation({ invitationId: invitationId })
			toast.info("Invitation resent", {
				description: "The invitation has been resent successfully.",
			})
		} catch (error) {
			toast.error("Failed to resend invitation", {
				description: error instanceof Error ? error.message : "An error occurred",
			})
		}
	}

	const handleRevokeInvitation = async (invitationId: Id<"invitations">) => {
		try {
			await revokeInvitationMutation({ invitationId })
			toast.info("Invitation revoked", {
				description: "The invitation has been revoked successfully.",
			})
		} catch (error) {
			toast.error("Failed to revoke invitation", {
				description: error instanceof Error ? error.message : "An error occurred",
			})
		}
	}

	return (
		<Form
			className="flex flex-col gap-6 px-4 lg:px-8"
			onSubmit={(e) => {
				e.preventDefault()
				const data = Object.fromEntries(new FormData(e.currentTarget))
				console.log("Form data:", data)
			}}
		>
			<TableCard.Root className="rounded-none bg-transparent shadow-none ring-0 lg:rounded-xl lg:bg-primary lg:shadow-xs lg:ring-1">
				<TableCard.Header
					title="Team members"
					description="Manage your team members and their account permissions here."
					className="pb-5"
					badge={
						<Badge color="gray" type="modern" size="sm">
							{teamMembers.length} users
						</Badge>
					}
					contentTrailing={
						<div className="flex gap-3">
							<Button size="md" iconLeading={Plus} onClick={() => setShowInviteModal(true)}>
								Invite user
							</Button>
						</div>
					}
				/>
				{isLoading ? (
					<div className="flex h-64 items-center justify-center">
						<p className="text-sm text-tertiary">Loading team members...</p>
					</div>
				) : (
					<Table
						aria-label="Team members"
						selectionMode="multiple"
						sortDescriptor={sortDescriptor}
						onSortChange={setSortDescriptor}
						className="bg-primary"
					>
						<Table.Header className="bg-primary">
							<Table.Head id="name" isRowHeader label="Name" allowsSorting className="w-full" />
							<Table.Head id="status" label="Status" allowsSorting />
							<Table.Head id="email" label="Email address" allowsSorting />
							<Table.Head id="role" label="Role" allowsSorting />
							<Table.Head id="actions" />
						</Table.Header>
						<Table.Body items={teamMembers}>
							{(member) => (
								<Table.Row id={member.id} className="odd:bg-secondary_subtle">
									<Table.Cell>
										<div className="flex w-max items-center gap-3">
											<Avatar
												src={member.avatarUrl}
												initials={getInitials(member.name)}
												alt={member.name}
											/>
											<p className="font-medium text-primary text-sm">{member.name}</p>
										</div>
									</Table.Cell>
									<Table.Cell>
										<BadgeWithDot
											color={
												member.status === "Active"
													? "success"
													: member.status === "Offline"
														? "gray"
														: "gray"
											}
											size="sm"
											type="modern"
										>
											{member.status}
										</BadgeWithDot>
									</Table.Cell>
									<Table.Cell>{member.email}</Table.Cell>
									<Table.Cell>
										<Badge
											color={
												roleToBadgeColorsMap[
													member.role as keyof typeof roleToBadgeColorsMap
												] ?? "gray"
											}
											type="pill-color"
											size="sm"
										>
											{member.role.charAt(0).toUpperCase() + member.role.slice(1)}
										</Badge>
									</Table.Cell>

									<Table.Cell className="px-4">
										<div className="flex justify-end gap-0.5">
											<ButtonUtility
												size="xs"
												color="tertiary"
												tooltip="Delete"
												icon={Trash01}
											/>
											<ButtonUtility
												size="xs"
												color="tertiary"
												tooltip="Edit"
												icon={Edit01}
											/>
										</div>
									</Table.Cell>
								</Table.Row>
							)}
						</Table.Body>
					</Table>
				)}
				<PaginationCardDefault page={1} total={Math.ceil(teamMembers.length / 10)} />
			</TableCard.Root>

			{/* Pending Invitations Section */}
			<TableCard.Root className="rounded-none bg-transparent shadow-none ring-0 lg:rounded-xl lg:bg-primary lg:shadow-xs lg:ring-1">
				<TableCard.Header
					title="Pending invitations"
					description="Manage pending invitations sent to team members."
					className="pb-5"
					badge={
						<Badge color="gray" type="modern" size="sm">
							{pendingInvitations.length} pending
						</Badge>
					}
				/>
				{isInvitationsLoading ? (
					<div className="flex h-64 items-center justify-center">
						<p className="text-sm text-tertiary">Loading invitations...</p>
					</div>
				) : pendingInvitations.length === 0 ? (
					<div className="flex h-64 items-center justify-center">
						<p className="text-sm text-tertiary">No pending invitations</p>
					</div>
				) : (
					<Table
						aria-label="Pending invitations"
						selectionMode="multiple"
						sortDescriptor={invitationsSortDescriptor}
						onSortChange={setInvitationsSortDescriptor}
						className="bg-primary"
					>
						<Table.Header className="bg-primary">
							<Table.Head
								id="email"
								isRowHeader
								label="Email"
								allowsSorting
								className="w-full"
							/>
							<Table.Head id="role" label="Role" allowsSorting />
							<Table.Head id="invitedBy" label="Invited by" allowsSorting />
							<Table.Head id="status" label="Status" />
							<Table.Head id="expiry" label="Expiration" allowsSorting />
							<Table.Head id="actions" />
						</Table.Header>
						<Table.Body items={pendingInvitations}>
							{(invitation) => (
								<Table.Row id={invitation._id} className="odd:bg-secondary_subtle">
									<Table.Cell>
										<p className="font-medium text-primary text-sm">{invitation.email}</p>
									</Table.Cell>
									<Table.Cell>
										<Badge
											color={
												roleToBadgeColorsMap[
													invitation.role as keyof typeof roleToBadgeColorsMap
												] ?? "gray"
											}
											type="pill-color"
											size="sm"
										>
											{invitation.role.charAt(0).toUpperCase() +
												invitation.role.slice(1)}
										</Badge>
									</Table.Cell>
									<Table.Cell>
										<p className="text-tertiary text-sm">
											{invitation.inviterName || "System"}
										</p>
									</Table.Cell>
									<Table.Cell>
										<BadgeWithDot color="warning" size="sm" type="modern">
											Pending
										</BadgeWithDot>
									</Table.Cell>
									<Table.Cell>
										<p className="text-tertiary text-sm">
											{formatTimeRemaining(invitation.timeUntilExpiry)}
										</p>
									</Table.Cell>
									<Table.Cell className="px-4">
										<div className="flex justify-end gap-0.5">
											<ButtonUtility
												size="xs"
												color="tertiary"
												tooltip="Resend invitation"
												icon={RefreshCcw02}
												onPress={() => handleResendInvitation(invitation._id)}
												isDisabled={resendInvitationMutation.isPending}
											/>
											<ButtonUtility
												size="xs"
												color="tertiary"
												tooltip="Revoke invitation"
												icon={XClose}
												onPress={() => handleRevokeInvitation(invitation._id)}
												isDisabled={revokeInvitationMutation.isPending}
											/>
										</div>
									</Table.Cell>
								</Table.Row>
							)}
						</Table.Body>
					</Table>
				)}
				<PaginationCardDefault page={1} total={Math.ceil(pendingInvitations.length / 10)} />
			</TableCard.Root>

			<EmailInviteModal isOpen={showInviteModal} onOpenChange={setShowInviteModal} />
		</Form>
	)
}
