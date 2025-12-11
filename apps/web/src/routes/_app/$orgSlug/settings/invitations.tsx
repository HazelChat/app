import { useAtomSet } from "@effect-atom/atom-react"
import type { InvitationId } from "@hazel/schema"
import { ArrowPathIcon } from "@heroicons/react/20/solid"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { resendInvitationMutation, revokeInvitationMutation } from "~/atoms/invitation-atoms"
import IconClose from "~/components/icons/icon-close"
import IconCopy from "~/components/icons/icon-copy"
import IconDots from "~/components/icons/icon-dots"
import IconPlus from "~/components/icons/icon-plus"
import { EmailInviteModal } from "~/components/modals/email-invite-modal"
import { Button } from "~/components/ui/button"
import { EmptyState } from "~/components/ui/empty-state"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/ui/menu"
import { invitationCollection, userCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { toastExit } from "~/lib/toast-exit"

export const Route = createFileRoute("/_app/$orgSlug/settings/invitations")({
	component: InvitationsSettings,
})

function InvitationsSettings() {
	const [showInviteModal, setShowInviteModal] = useState(false)
	const [resendingId, setResendingId] = useState<InvitationId | null>(null)
	const [revokingId, setRevokingId] = useState<InvitationId | null>(null)

	const { organizationId } = useOrganization()

	const resendInvitation = useAtomSet(resendInvitationMutation, {
		mode: "promiseExit",
	})

	const revokeInvitation = useAtomSet(revokeInvitationMutation, {
		mode: "promiseExit",
	})

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

	const handleCopyInvitationUrl = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url)
			toast.success("Invitation URL copied to clipboard")
		} catch (_error) {
			toast.error("Failed to copy invitation URL")
		}
	}

	const handleResendInvitation = async (invitationId: InvitationId) => {
		setResendingId(invitationId)
		try {
			await toastExit(
				resendInvitation({
					payload: {
						invitationId,
					},
				}),
				{
					loading: "Resending invitation...",
					success: "Invitation resent successfully",
					error: "Failed to resend invitation",
					customErrors: {
						InvitationNotFoundError: () => ({
							title: "Invitation not found",
							description: "This invitation may have been revoked or expired.",
							isRetryable: false,
						}),
					},
				},
			)
		} finally {
			setResendingId(null)
		}
	}

	const handleRevokeInvitation = async (invitationId: InvitationId) => {
		setRevokingId(invitationId)
		try {
			await toastExit(
				revokeInvitation({
					payload: {
						invitationId,
					},
				}),
				{
					loading: "Revoking invitation...",
					success: "Invitation revoked successfully",
					error: "Failed to revoke invitation",
					customErrors: {
						InvitationNotFoundError: () => ({
							title: "Invitation not found",
							description: "This invitation may have already been revoked or expired.",
							isRetryable: false,
						}),
					},
				},
			)
		} finally {
			setRevokingId(null)
		}
	}

	return (
		<>
			<div className="flex flex-col gap-6 px-4 lg:px-8">
				<div className="overflow-hidden rounded-xl border border-border bg-bg shadow-sm">
					<div className="border-border border-b bg-bg px-4 py-5 md:px-6">
						<div className="flex flex-col items-start gap-4 md:flex-row">
							<div className="flex flex-1 flex-col gap-0.5">
								<div className="flex items-center gap-2">
									<h2 className="font-semibold text-fg text-lg">Pending invitations</h2>
									{pendingInvitations.length > 0 && (
										<span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-xs">
											{pendingInvitations.length} pending
										</span>
									)}
								</div>
								<p className="text-muted-fg text-sm">
									Manage pending invitations sent to team members.
								</p>
							</div>
							<div className="flex gap-3">
								<Button intent="secondary" size="md" onPress={() => setShowInviteModal(true)}>
									<IconPlus data-slot="icon" />
									Invite user
								</Button>
							</div>
						</div>
					</div>

					{pendingInvitations.length === 0 ? (
						<EmptyState
							title="No pending invitations"
							description="Invite team members to join your organization."
							className="h-64"
						/>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-full">
								<thead className="border-border border-b bg-bg">
									<tr>
										<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
											Email
										</th>
										<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
											Invited by
										</th>
										<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
											Status
										</th>
										<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
											Expiration
										</th>
										<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{pendingInvitations.map((invitation) => (
										<tr key={invitation.id} className="hover:bg-secondary/50">
											<td className="px-4 py-4">
												<p className="font-medium text-fg text-sm">
													{invitation.email}
												</p>
											</td>
											<td className="px-4 py-4">
												<p className="text-muted-fg text-sm">
													{invitation.invitee
														? `${invitation.invitee.firstName} ${invitation.invitee.lastName}`
														: "System"}
												</p>
											</td>
											<td className="px-4 py-4">
												<span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning text-xs">
													<span className="size-1.5 rounded-full bg-current" />
													Pending
												</span>
											</td>
											<td className="px-4 py-4">
												<p className="text-muted-fg text-sm">
													{formatTimeRemaining(
														invitation.expiresAt.getTime() - Date.now(),
													)}
												</p>
											</td>
											<td className="px-4 py-4">
												<Menu>
													<Button
														intent="plain"
														size="sq-xs"
														isPending={
															resendingId === invitation.id ||
															revokingId === invitation.id
														}
														isDisabled={
															resendingId === invitation.id ||
															revokingId === invitation.id
														}
													>
														<IconDots />
													</Button>
													<MenuContent placement="bottom end">
														<MenuItem
															onAction={() =>
																handleCopyInvitationUrl(
																	invitation.invitationUrl,
																)
															}
															isDisabled={
																resendingId === invitation.id ||
																revokingId === invitation.id
															}
														>
															<IconCopy className="mr-2 size-4" />
															Copy Invitation URL
														</MenuItem>
														<MenuItem
															onAction={() =>
																handleResendInvitation(invitation.id)
															}
															isDisabled={
																resendingId === invitation.id ||
																revokingId === invitation.id
															}
														>
															<ArrowPathIcon className="mr-2 size-4" />
															{resendingId === invitation.id
																? "Resending..."
																: "Resend Invitation"}
														</MenuItem>
														<MenuItem
															onAction={() =>
																handleRevokeInvitation(invitation.id)
															}
															intent="danger"
															isDisabled={
																resendingId === invitation.id ||
																revokingId === invitation.id
															}
														>
															<IconClose className="mr-2 size-4" />
															{revokingId === invitation.id
																? "Revoking..."
																: "Revoke Invitation"}
														</MenuItem>
													</MenuContent>
												</Menu>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>

			{/* Email Invite Modal */}
			{organizationId && (
				<EmailInviteModal
					isOpen={showInviteModal}
					onOpenChange={setShowInviteModal}
					organizationId={organizationId}
				/>
			)}
		</>
	)
}
