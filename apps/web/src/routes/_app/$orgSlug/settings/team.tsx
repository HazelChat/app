import { useAtomSet } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/schema"
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { createDmChannelMutation } from "~/atoms/channel-atoms"
import { openModal } from "~/atoms/modal-atoms"
import IconCircleDottedUser from "~/components/icons/icon-circle-dotted-user"
import IconDotsVertical from "~/components/icons/icon-dots-vertical"
import IconMessage from "~/components/icons/icon-msgs"
import IconPlus from "~/components/icons/icon-plus"
import IconTrash from "~/components/icons/icon-trash"
import { ChangeRoleModal } from "~/components/modals/change-role-modal"
import { EmailInviteModal } from "~/components/modals/email-invite-modal"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog"
import { DropdownLabel, DropdownSeparator } from "~/components/ui/dropdown"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/ui/menu"
import { Modal, ModalContent } from "~/components/ui/modal"
import { organizationMemberCollection, userCollection, userPresenceStatusCollection } from "~/db/collections"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { findExistingDmChannel } from "~/lib/channels"
import { toastExit } from "~/lib/toast-exit"
import { cn } from "~/lib/utils"

export const Route = createFileRoute("/_app/$orgSlug/settings/team")({
	component: TeamSettings,
})

function TeamSettings() {
	const [removeUserId, setRemoveUserId] = useState<UserId | null>(null)
	const [showInviteModal, setShowInviteModal] = useState(false)

	const navigate = useNavigate()
	const { organizationId, slug: orgSlug } = useOrganization()
	const { user } = useAuth()

	const createDmChannel = useAtomSet(createDmChannelMutation, {
		mode: "promiseExit",
	})

	const { data: teamMembers } = useLiveQuery(
		(q) =>
			q
				.from({ members: organizationMemberCollection })
				.where(({ members }) => eq(members.organizationId, organizationId))
				.innerJoin({ user: userCollection }, ({ members, user }) => eq(members.userId, user.id))
				.leftJoin({ presence: userPresenceStatusCollection }, ({ user, presence }) =>
					eq(user.id, presence.userId),
				)
				.select(({ members, user, presence }) => ({ ...members, user, presence })),
		[organizationId],
	)

	const roleToBadgeColors = {
		owner: "bg-primary text-primary-fg",
		admin: "bg-pink-600 text-white",
		member: "bg-secondary text-fg",
	}

	const getInitials = (name: string) => {
		const [firstName, lastName] = name.split(" ")
		return `${firstName?.charAt(0)}${lastName?.charAt(0)}`
	}

	const handleRemoveUser = async (userId: UserId) => {
		try {
			const membership = teamMembers?.find((m) => m.userId === userId)
			if (!membership) return
			const tx = organizationMemberCollection.delete(membership.id)

			await tx.isPersisted.promise

			toast.success("Member removed", {
				description: "The member has been removed from the organization.",
			})
			setRemoveUserId(null)
		} catch (error) {
			toast.error("Failed to remove member", {
				description: error instanceof Error ? error.message : "An error occurred",
			})
		}
	}

	const canManageUser = (targetUserRole: string) => {
		if (!user) return false
		const currentUserMember = teamMembers?.find((m) => m.userId === user.id)
		if (!currentUserMember) return false

		const currentRole = currentUserMember.role

		if (currentRole === "owner") return true
		if (currentRole === "admin" && targetUserRole === "member") return true

		return false
	}

	const getStatusColor = (status?: string) => {
		switch (status) {
			case "online":
				return "text-success"
			case "away":
			case "busy":
				return "text-warning"
			case "dnd":
				return "text-danger"
			default:
				return "text-muted-fg"
		}
	}

	const handleMessageUser = async (targetUserId: UserId, targetUserName: string) => {
		if (!user?.id || !organizationId || !orgSlug) return

		const existingChannel = findExistingDmChannel(user.id, targetUserId)

		if (existingChannel) {
			navigate({
				to: "/$orgSlug/chat/$id",
				params: { orgSlug, id: existingChannel.id },
			})
		} else {
			const result = await toastExit(
				createDmChannel({
					payload: {
						organizationId,
						participantIds: [targetUserId],
						type: "single",
					},
				}),
				{
					loading: `Starting conversation with ${targetUserName}...`,
					success: (data) => {
						// Navigate to the newly created channel
						if (data.channel?.id) {
							navigate({
								to: "/$orgSlug/chat/$id",
								params: { orgSlug, id: data.channel.id },
							})
						}
						return `Started conversation with ${targetUserName}`
					},
				},
			)
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
									<h2 className="font-semibold text-fg text-lg">Team members</h2>
									<span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-xs">
										{teamMembers?.length || 0} users
									</span>
								</div>
								<p className="text-muted-fg text-sm">
									Manage your team members and their account permissions here.
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

					<div className="overflow-x-auto">
						<table className="w-full min-w-full">
							<thead className="border-border border-b bg-bg">
								<tr>
									<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
										Name
									</th>
									<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
										Status
									</th>
									<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
										Role
									</th>
									<th className="px-4 py-3 text-left font-medium text-muted-fg text-xs">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{teamMembers?.map((member) => (
									<tr key={member.id} className="hover:bg-secondary/50">
										<td className="px-4 py-4">
											<div className="flex items-center gap-3">
												<Avatar
													src={member.user.avatarUrl}
													initials={getInitials(
														`${member.user.firstName} ${member.user.lastName}`,
													)}
													className="size-9"
												/>
												<div className="flex flex-col">
													<span className="font-medium text-fg text-sm">
														{`${member.user.firstName} ${member.user.lastName}`}
													</span>
													<span className="text-muted-fg text-xs">
														{member.user.email}
													</span>
												</div>
											</div>
										</td>
										<td className="px-4 py-4">
											<span
												className={cn(
													"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-xs",
													getStatusColor(member.presence?.status),
												)}
											>
												<span className="size-1.5 rounded-full bg-current" />
												{member.presence?.status
													? member.presence.status.charAt(0).toUpperCase() +
														member.presence.status.slice(1)
													: "Offline"}
											</span>
										</td>
										<td className="px-4 py-4">
											<span
												className={cn(
													"inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
													roleToBadgeColors[
														member.role as keyof typeof roleToBadgeColors
													] || "bg-secondary text-fg",
												)}
											>
												{member.role.charAt(0).toUpperCase() + member.role.slice(1)}
											</span>
										</td>
										<td className="px-4 py-4">
											{user &&
												member.userId !== user.id &&
												canManageUser(member.role) && (
													<div className="flex justify-end">
														<Menu>
															<MenuTrigger
																aria-label="Actions"
																className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-secondary"
															>
																<IconDotsVertical className="size-5 text-muted-fg" />
															</MenuTrigger>
															<MenuContent placement="bottom end">
																<MenuItem
																	onAction={() =>
																		handleMessageUser(
																			member.userId,
																			`${member.user.firstName} ${member.user.lastName}`,
																		)
																	}
																>
																	<IconMessage data-slot="icon" />
																	<DropdownLabel>
																		Send message
																	</DropdownLabel>
																</MenuItem>
																<DropdownSeparator />
																<MenuItem
																	onAction={() => {
																		const currentUserMember =
																			teamMembers?.find(
																				(m) => m.userId === user?.id,
																			)
																		openModal("change-role", {
																			userId: member.userId,
																			name: `${member.user.firstName} ${member.user.lastName}`,
																			memberId: member.id,
																			role: member.role,
																			currentUserRole:
																				currentUserMember?.role ||
																				"member",
																		})
																	}}
																>
																	<IconCircleDottedUser data-slot="icon" />
																	<DropdownLabel>Change role</DropdownLabel>
																</MenuItem>
																<DropdownSeparator />
																<MenuItem
																	intent="danger"
																	onAction={() =>
																		setRemoveUserId(member.userId)
																	}
																>
																	<IconTrash data-slot="icon" />
																	<DropdownLabel>
																		Remove from team
																	</DropdownLabel>
																</MenuItem>
															</MenuContent>
														</Menu>
													</div>
												)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Remove Member Confirmation Modal */}
			<Modal>
				<ModalContent
					isOpen={!!removeUserId}
					onOpenChange={(open) => !open && setRemoveUserId(null)}
					size="md"
				>
					<Dialog>
						<DialogHeader>
							<div className="flex size-12 items-center justify-center rounded-lg border border-danger/10 bg-danger/5">
								<ExclamationTriangleIcon className="size-6 text-danger" />
							</div>
							<DialogTitle>Remove team member</DialogTitle>
							<DialogDescription>
								Are you sure you want to remove this member from your team? They will lose
								access to all channels and messages.
							</DialogDescription>
						</DialogHeader>

						<DialogFooter>
							<DialogClose intent="secondary">Cancel</DialogClose>
							<Button
								intent="danger"
								onPress={() => removeUserId && handleRemoveUser(removeUserId)}
							>
								Remove member
							</Button>
						</DialogFooter>
					</Dialog>
				</ModalContent>
			</Modal>

			{/* Email Invite Modal */}
			{organizationId && (
				<EmailInviteModal
					isOpen={showInviteModal}
					onOpenChange={setShowInviteModal}
					organizationId={organizationId}
				/>
			)}

			{/* Change Role Modal */}
			<ChangeRoleModal />
		</>
	)
}
