import type { OrganizationId, OrganizationMemberId, UserId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Plus, Trash01, User02 } from "@untitledui/icons"
import { useState } from "react"
import type { SortDescriptor } from "react-aria-components"
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { ChangeRoleModal } from "~/components/application/modals/change-role-modal"
import { EmailInviteModal } from "~/components/application/modals/email-invite-modal"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { PaginationCardDefault } from "~/components/application/pagination/pagination"
import { Table, TableCard } from "~/components/application/table/table"
import { Avatar } from "~/components/base/avatar/avatar"
import { Badge, type BadgeColor, BadgeWithDot } from "~/components/base/badges/badges"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { organizationMemberCollection, userCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"

export const Route = createFileRoute("/_app/$orgId/settings/team")({
	component: RouteComponent,
})

function RouteComponent() {
	const { orgId } = Route.useParams()
	const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
		column: "status",
		direction: "ascending",
	})
	const [showInviteModal, setShowInviteModal] = useState(false)
	const [changeRoleUser, setChangeRoleUser] = useState<{
		id: UserId
		memberId: OrganizationMemberId
		name: string
		role: string
	} | null>(null)
	const [removeUserId, setRemoveUserId] = useState<UserId | null>(null)

	const organizationId = orgId as OrganizationId

	const { data: teamMembers } = useLiveQuery(
		(q) =>
			q
				.from({ members: organizationMemberCollection })
				.where(({ members }) => eq(members.organizationId, organizationId))
				.innerJoin({ user: userCollection }, ({ members, user }) => eq(members.userId, user.id))
				.select(({ members, user }) => ({ ...members, user })),
		[organizationId],
	)

	const { user } = useAuth()

	const roleToBadgeColorsMap: Record<string, BadgeColor<"pill-color">> = {
		owner: "brand",
		admin: "pink",
		member: "gray",
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

	const canManageUser = (_userRole: string, targetUserRole: string) => {
		if (!user) return false
		const currentUserMember = teamMembers.find((m) => m.userId === user.id)
		if (!currentUserMember) return false

		const currentRole = currentUserMember.role

		if (currentRole === "owner") return true

		if (currentRole === "admin" && targetUserRole === "member") return true

		return false
	}

	return (
		<div className="flex flex-col gap-6 px-4 lg:px-8">
			<TableCard.Root className="rounded-none bg-transparent shadow-none ring-0 lg:rounded-xl lg:bg-primary lg:shadow-xs lg:ring">
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
							<Button
								color="secondary"
								size="md"
								iconLeading={Plus}
								onClick={() => setShowInviteModal(true)}
							>
								Invite user
							</Button>
						</div>
					}
				/>

				<Table
					aria-label="Team members"
					sortDescriptor={sortDescriptor}
					onSortChange={setSortDescriptor}
					className="bg-primary"
				>
					<Table.Header className="bg-primary">
						<Table.Head id="name" isRowHeader label="Name" allowsSorting className="w-full" />
						<Table.Head id="status" label="Status" allowsSorting />
						<Table.Head id="role" label="Role" allowsSorting />
						<Table.Head id="actions" />
					</Table.Header>
					<Table.Body items={teamMembers}>
						{(member) => (
							<Table.Row id={member.id} className="odd:bg-secondary_subtle">
								<Table.Cell>
									<div className="flex w-max items-center gap-3">
										<Avatar
											src={member.user.avatarUrl}
											initials={getInitials(
												`${member.user.firstName} ${member.user.lastName}`,
											)}
											alt={`${member.user.firstName} ${member.user.lastName}`}
											className="size-9 rounded-md *:rounded-md"
											// TODO: Readd
											status={"online"}
										/>
										<div className="flex flex-col">
											<span className="font-medium text-primary text-sm/6">
												{`${member.user.firstName} ${member.user.lastName}`}
											</span>
											<span className="text-tertiary">{member.user.email}</span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<BadgeWithDot
										className="rounded-full"
										// biome-ignore lint/correctness/noConstantCondition: <explanation>
										color={true ? "success" : true ? "gray" : "gray"}
										size="sm"
										type="modern"
									>
										Online
									</BadgeWithDot>
								</Table.Cell>
								<Table.Cell>
									<Badge
										className="rounded-full"
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
									{user &&
										member.userId !== user.id &&
										canManageUser(member.role, member.role) && (
											<Dropdown.Root>
												<Dropdown.DotsButton />
												<Dropdown.Popover>
													<Dropdown.Menu
														onAction={(key) => {
															const action = key as string
															if (action === "change-role") {
																setChangeRoleUser({
																	id: member.userId,
																	name: `${member.user.firstName} ${member.user.lastName}`,
																	memberId: member.id,
																	role: member.role,
																})
															} else if (action === "remove") {
																setRemoveUserId(member.userId)
															}
														}}
													>
														<Dropdown.Item
															id="change-role"
															label="Change role"
															icon={User02}
														/>
														<Dropdown.Separator />
														<Dropdown.Item
															id="remove"
															label="Remove from team"
															icon={Trash01}
														/>
													</Dropdown.Menu>
												</Dropdown.Popover>
											</Dropdown.Root>
										)}
								</Table.Cell>
							</Table.Row>
						)}
					</Table.Body>
				</Table>

				<PaginationCardDefault page={1} total={Math.ceil(teamMembers.length / 10)} />
			</TableCard.Root>

			<EmailInviteModal isOpen={showInviteModal} onOpenChange={setShowInviteModal} />

			{changeRoleUser && user && (
				<ChangeRoleModal
					isOpen={!!changeRoleUser}
					onOpenChange={(open) => !open && setChangeRoleUser(null)}
					user={changeRoleUser}
					currentUserRole={teamMembers.find((m) => m.userId === user.id)?.role || "member"}
				/>
			)}

			{removeUserId && (
				<AriaDialogTrigger
					isOpen={!!removeUserId}
					onOpenChange={(open) => !open && setRemoveUserId(null)}
				>
					<ModalOverlay isDismissable>
						<Modal>
							<Dialog>
								<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-md">
									<CloseButton
										onClick={() => setRemoveUserId(null)}
										theme="light"
										size="lg"
										className="absolute top-3 right-3"
									/>
									<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
										<div className="relative w-max">
											<FeaturedIcon
												color="error"
												size="lg"
												theme="modern"
												icon={AlertTriangle}
											/>
										</div>
										<div className="z-10 flex flex-col gap-0.5">
											<AriaHeading
												slot="title"
												className="font-semibold text-md text-primary"
											>
												Remove team member
											</AriaHeading>
											<p className="text-sm text-tertiary">
												Are you sure you want to remove this member from your team?
												They will lose access to all channels and messages.
											</p>
										</div>
									</div>
									<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
										<Button
											color="secondary"
											size="lg"
											onClick={() => setRemoveUserId(null)}
										>
											Cancel
										</Button>
										<Button
											color="primary-destructive"
											size="lg"
											onClick={() => removeUserId && handleRemoveUser(removeUserId)}
										>
											Remove member
										</Button>
									</div>
								</div>
							</Dialog>
						</Modal>
					</ModalOverlay>
				</AriaDialogTrigger>
			)}
		</div>
	)
}
