import type { InvitationId, OrganizationId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute } from "@tanstack/react-router"
import { RefreshCcw02 } from "@untitledui/icons"
import { useState } from "react"
import type { SortDescriptor } from "react-aria-components"
import { toast } from "sonner"
import { EmailInviteModal } from "~/components/application/modals/email-invite-modal"
import { PaginationCardDefault } from "~/components/application/pagination/pagination"
import { Table, TableCard } from "~/components/application/table/table"
import { Badge, BadgeWithDot } from "~/components/base/badges/badges"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import IconClose from "~/components/icons/icon-close"
import IconPlus from "~/components/icons/icon-plus"
import { invitationCollection, userCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"

export const Route = createFileRoute("/_app/$orgSlug/settings/invitations")({
	component: RouteComponent,
})

function RouteComponent() {
	const [invitationsSortDescriptor, setInvitationsSortDescriptor] = useState<SortDescriptor>({
		column: "email",
		direction: "ascending",
	})
	const [showInviteModal, setShowInviteModal] = useState(false)

	const { organizationId } = useOrganization()

	const { data: invitations } = useLiveQuery(
		(q) =>
			q
				.from({
					invitation: invitationCollection,
				})
				.leftJoin(
					{
						invitee: userCollection,
					},
					({ invitation, invitee }) => eq(invitation.invitedBy, invitee.id),
				)
				.where(({ invitation }) => eq(invitation.organizationId, organizationId))
				.select(({ invitation, invitee }) => ({
					...invitation,
					invitee,
				})),
		[organizationId],
	)

	const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") || []

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

	const handleResendInvitation = async (_invitationId: InvitationId) => {
		try {
			// TODO: Resend mutation
			// await resendInvitationMutation({
			// 	invitationId,
			// })
			toast.info("Invitation resent", {
				description: "The invitation has been resent successfully.",
			})
		} catch (error) {
			toast.error("Failed to resend invitation", {
				description: error instanceof Error ? error.message : "An error occurred",
			})
		}
	}

	const handleRevokeInvitation = async (_invitationId: InvitationId) => {
		try {
			// await revokeInvitationMutation({
			// 	invitationId,
			// })
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
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			<TableCard.Root className="rounded-none bg-transparent shadow-none ring-0 lg:rounded-xl lg:bg-primary lg:shadow-xs lg:ring">
				<TableCard.Header
					title="Pending invitations"
					description="Manage pending invitations sent to team members."
					className="pb-5"
					badge={
						pendingInvitations.length === 0 ? undefined : (
							<Badge className="rounded-full" color="gray" type="modern" size="sm">
								{pendingInvitations.length} pending
							</Badge>
						)
					}
					contentTrailing={
						<div className="flex gap-3">
							<Button
								color="secondary"
								size="md"
								iconLeading={IconPlus}
								onClick={() => setShowInviteModal(true)}
							>
								Invite user
							</Button>
						</div>
					}
				/>
				{pendingInvitations.length === 0 ? (
					<div className="flex h-64 items-center justify-center">
						<p className="text-sm text-tertiary">No pending invitations</p>
					</div>
				) : (
					<Table
						aria-label="Pending invitations"
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
							<Table.Head id="invitedBy" label="Invited by" allowsSorting />
							<Table.Head id="status" label="Status" />
							<Table.Head id="expiry" label="Expiration" allowsSorting />
							<Table.Head id="actions" />
						</Table.Header>
						<Table.Body items={pendingInvitations}>
							{(invitation) => (
								<Table.Row id={invitation.id} className="odd:bg-secondary_subtle">
									<Table.Cell>
										<p className="font-medium text-primary text-sm">{invitation.email}</p>
									</Table.Cell>

									<Table.Cell>
										<p className="text-sm text-tertiary">
											{invitation.invitedBy || "System"}
										</p>
									</Table.Cell>
									<Table.Cell>
										<BadgeWithDot
											className="rounded-full"
											color="warning"
											size="sm"
											type="modern"
										>
											Pending
										</BadgeWithDot>
									</Table.Cell>
									<Table.Cell>
										<p className="text-sm text-tertiary">
											{formatTimeRemaining(invitation.expiresAt.getTime() - Date.now())}
										</p>
									</Table.Cell>
									<Table.Cell className="px-4">
										<div className="flex justify-end gap-0.5">
											<ButtonUtility
												size="xs"
												color="tertiary"
												tooltip="Resend invitation"
												icon={RefreshCcw02}
												onClick={() => handleResendInvitation(invitation.id)}
											/>
											<ButtonUtility
												size="xs"
												color="tertiary"
												tooltip="Revoke invitation"
												icon={IconClose}
												onClick={() => handleRevokeInvitation(invitation.id)}
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
		</div>
	)
}
