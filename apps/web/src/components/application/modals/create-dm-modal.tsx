import { useAtomSet } from "@effect-atom/atom-react"
import type { User } from "@hazel/db/models"
import type { UserId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useNavigate } from "@tanstack/react-router"
import { Mail01, MessageSquare02, Plus } from "@untitledui/icons"
import { type } from "arktype"
import { useMemo, useState } from "react"
import { Heading as AriaHeading } from "react-aria-components"
import { Dialog, Modal, ModalFooter, ModalOverlay } from "~/components/application/modals/modal"
import { Avatar } from "~/components/base/avatar/avatar"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Input } from "~/components/base/input/input"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import IconCheck from "~/components/icons/icon-check"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { organizationMemberCollection, userCollection, userPresenceStatusCollection } from "~/db/collections"
import { useAppForm } from "~/hooks/use-app-form"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { toastExit } from "~/lib/toast-exit"
import { cx } from "~/utils/cx"
import { createDmChannelMutation } from "~/atoms/channel-atoms"

const dmFormSchema = type({
	userIds: "string[]",
})

type DmFormData = typeof dmFormSchema.infer

interface CreateDmModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export const CreateDmModal = ({ isOpen, onOpenChange }: CreateDmModalProps) => {
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedUsers, setSelectedUsers] = useState<(typeof User.Model.Type)[]>([])

	const navigate = useNavigate()
	const { organizationId, slug } = useOrganization()

	const createDmChannel = useAtomSet(createDmChannelMutation, {
		mode: "promiseExit",
	})

	const { user } = useAuth()

	const { data: organizationUsers } = useLiveQuery(
		(q) =>
			q
				.from({ member: organizationMemberCollection })
				.innerJoin({ user: userCollection }, ({ member, user }) => eq(member.userId, user.id))
				.leftJoin({ presence: userPresenceStatusCollection }, ({ user, presence }) =>
					eq(user.id, presence.userId),
				)
				.where(({ member }) => eq(member.organizationId, organizationId))
				.select(({ user, presence }) => ({
					...user,
					presence,
				})),
		[organizationId],
	)

	const form = useAppForm({
		defaultValues: {
			userIds: [],
		} as DmFormData,
		validators: {
			onChange: dmFormSchema,
		},
		onSubmit: async ({ value }) => {
			if (value.userIds.length === 0 || !user?.id || !organizationId || !slug) return

			// Determine if it's a single DM or group
			const type = value.userIds.length === 1 ? "single" : "direct"

			// Get selected users for group name
			const selectedUserNames =
				value.userIds.length > 1
					? organizationUsers
							?.filter((u) => value.userIds.includes(u?.id || ""))
							?.map((u) => u?.firstName || "")
							?.slice(0, 3)
							?.join(", ")
					: undefined

			const targetUser = organizationUsers?.find((u) => u?.id === value.userIds[0])

			const exit = await toastExit(
				createDmChannel({
					payload: {
						organizationId,
						participantIds: value.userIds as UserId[],
						type,
						name: type === "direct" ? selectedUserNames : undefined,
					},
				}),
				{
					loading: "Creating conversation...",
					success: (result) => {
						// Navigate to the created channel
						if (result.data.id) {
							navigate({
								to: "/$orgSlug/chat/$id",
								params: { orgSlug: slug, id: result.data.id },
							})
						}

						// Close modal and reset form
						onOpenChange(false)
						form.reset()
						setSelectedUsers([])
						setSearchQuery("")

						// Return success message
						if (type === "single") {
							return `Started conversation with ${targetUser?.firstName}`
						}
						return `Created group conversation with ${value.userIds.length} people`
					},
				},
			)

			return exit
		},
	})

	const filteredUsers = useMemo(() => {
		const users = organizationUsers || []
		// Filter out current user
		const otherUsers = users.filter((u) => u?.id !== user?.id)

		if (!searchQuery.trim()) return otherUsers

		const query = searchQuery.toLowerCase()
		return otherUsers.filter((user) => {
			if (!user) return false
			const firstName = user.firstName || ""
			const lastName = user.lastName || ""
			const fullName = `${firstName} ${lastName}`.trim()
			return (
				firstName.toLowerCase().includes(query) ||
				lastName.toLowerCase().includes(query) ||
				fullName.toLowerCase().includes(query)
			)
		})
	}, [organizationUsers, searchQuery, user?.id])

	const handleClose = () => {
		onOpenChange(false)
		// Reset form and state when closing
		form.reset()
		setSelectedUsers([])
		setSearchQuery("")
	}

	const toggleUserSelection = (user: typeof User.Model.Type) => {
		const isSelected = selectedUsers.some((u) => u.id === user.id)
		let newSelection: (typeof User.Model.Type)[]

		if (isSelected) {
			newSelection = selectedUsers.filter((u) => u.id !== user.id)
		} else {
			newSelection = [...selectedUsers, user]
		}

		setSelectedUsers(newSelection)
		form.setFieldValue(
			"userIds",
			newSelection.map((u) => u.id),
		)
	}

	return (
		<ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange}>
			<Modal>
				<Dialog>
					<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-130">
						<CloseButton
							onClick={handleClose}
							theme="light"
							size="lg"
							className="absolute top-3 right-3"
						/>
						<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
							<div className="relative w-max">
								<FeaturedIcon color="gray" size="lg" theme="modern" icon={MessageSquare02} />
								<BackgroundPattern
									pattern="circle"
									size="sm"
									className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
								/>
							</div>
							<div className="z-10 flex flex-col gap-0.5">
								<AriaHeading slot="title" className="font-semibold text-md text-primary">
									Start a conversation
								</AriaHeading>
								<p className="text-sm text-tertiary">
									Select one or more team members to start a conversation
								</p>
							</div>
						</div>
						<div className="h-5 w-full" />
						<div className="flex flex-col gap-4 px-4 sm:px-6">
							{/* Search Input */}
							<div className="flex flex-col gap-2">
								<Input
									size="md"
									placeholder="Search team members..."
									icon={Mail01}
									value={searchQuery}
									onChange={setSearchQuery}
								/>
								{selectedUsers.length > 0 && (
									<div className="flex items-center gap-2">
										<span className="text-sm text-tertiary">
											{selectedUsers.length} selected
										</span>
										<div className="-space-x-2 flex">
											{selectedUsers.slice(0, 3).map((user) => (
												<Avatar
													key={user.id}
													size="xs"
													src={user.avatarUrl}
													initials={`${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`}
													alt={`${user.firstName || ""} ${user.lastName || ""}`}
												/>
											))}
											{selectedUsers.length > 3 && (
												<div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary font-medium text-primary text-xs">
													+{selectedUsers.length - 3}
												</div>
											)}
										</div>
									</div>
								)}
							</div>

							{/* Users List */}
							<div className="max-h-64 overflow-y-auto">
								{filteredUsers.length === 0 ? (
									<p className="py-8 text-center text-sm text-tertiary">
										{searchQuery ? "No users found" : "No team members available"}
									</p>
								) : (
									<div className="flex flex-col gap-1">
										{filteredUsers.map((user) => (
											<button
												key={user?.id}
												type="button"
												onClick={() => user && toggleUserSelection(user)}
												className={cx(
													"flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-secondary",
													selectedUsers.some((u) => u.id === user?.id) &&
														"bg-secondary ring ring-border-brand ring-inset",
												)}
											>
												<div className="flex items-center gap-3">
													<Avatar
														size="sm"
														src={user?.avatarUrl}
														initials={`${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`}
														alt={`${user?.firstName || ""} ${user?.lastName || ""}`}
														status={
															user?.presence?.status === "online" ||
															user?.presence?.status === "away" ||
															user?.presence?.status === "busy" ||
															user?.presence?.status === "dnd"
																? "online"
																: "offline"
														}
													/>
													<div className="flex flex-col">
														<p className="font-medium text-primary text-sm">
															{user?.firstName || ""} {user?.lastName || ""}
														</p>
														{user?.presence?.status === "online" && (
															<span className="text-success text-xs">
																Active now
															</span>
														)}
														{user?.presence?.customMessage && (
															<span className="truncate text-tertiary text-xs">
																{user.presence.customMessage}
															</span>
														)}
													</div>
												</div>
												{selectedUsers.some((u) => u.id === user?.id) && (
													<IconCheck className="size-5 text-brand" />
												)}
											</button>
										))}
									</div>
								)}
							</div>
						</div>
						<ModalFooter>
							<Button
								color="secondary"
								size="lg"
								onClick={handleClose}
								isDisabled={form.state.isSubmitting}
							>
								Cancel
							</Button>
							<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
								{([canSubmit, isSubmitting]) => (
									<Button
										color="primary"
										size="lg"
										onClick={form.handleSubmit}
										isDisabled={!canSubmit || isSubmitting || selectedUsers.length === 0}
									>
										{isSubmitting
											? "Creating..."
											: selectedUsers.length > 1
												? `Start group conversation (${selectedUsers.length})`
												: "Start conversation"}
									</Button>
								)}
							</form.Subscribe>
						</ModalFooter>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}

export const CreateDmButton = () => {
	const [isModalOpen, setIsModalOpen] = useState(false)

	return (
		<>
			<ButtonUtility
				className="p-1 text-primary hover:text-secondary"
				size="xs"
				color="tertiary"
				icon={Plus}
				onClick={() => setIsModalOpen(true)}
				tooltip="New direct message"
			/>
			<CreateDmModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
		</>
	)
}
