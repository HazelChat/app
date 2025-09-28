import type { User } from "@hazel/db/models"
import {
	ChannelId,
	ChannelMemberId,
	DirectMessageParticipantId,
	type OrganizationId,
	type UserId,
} from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Mail01, MessageSquare02, Plus } from "@untitledui/icons"
import { type } from "arktype"
import { useMemo, useState } from "react"
import { Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { v4 as uuid } from "uuid"
import { Dialog, Modal, ModalFooter, ModalOverlay } from "~/components/application/modals/modal"
import { Avatar } from "~/components/base/avatar/avatar"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Input } from "~/components/base/input/input"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import IconCheckTickCircle from "~/components/icons/IconCheckTickCircle"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import {
	channelCollection,
	channelMemberCollection,
	directMessageParticipantCollection,
	organizationMemberCollection,
	userCollection,
} from "~/db/collections"
import { useAppForm } from "~/hooks/use-app-form"
import { useAuth } from "~/providers/auth-provider"
import { cx } from "~/utils/cx"

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
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const organizationId = orgId as OrganizationId

	// TODO: Implement
	const { isUserOnline } = {
		isUserOnline: (..._args: any[]) => true,
	}
	const { user } = useAuth()

	const { data: organizationUsers } = useLiveQuery(
		(q) =>
			q
				.from({ member: organizationMemberCollection })
				.innerJoin({ user: userCollection }, ({ member, user }) => eq(member.userId, user.id))
				.where(({ member }) => eq(member.organizationId, organizationId))
				.select(({ user }) => ({
					...user,
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
			if (value.userIds.length === 0 || !user?.id) return

			try {
				const channelId = ChannelId.make(uuid())

				// Create the channel
				if (value.userIds.length === 1) {
					// Single DM
					const _test = channelCollection.insert({
						id: channelId,
						name: "",
						type: "direct",
						organizationId,
						parentChannelId: null,
						createdAt: new Date(),
						updatedAt: null,
						deletedAt: null,
					})

					// Add participants to direct message
					const currentUserId = user?.id as UserId
					const otherUserId = value.userIds[0] as UserId

					directMessageParticipantCollection.insert({
						id: DirectMessageParticipantId.make(uuid()),
						channelId,
						userId: currentUserId,
						organizationId,
					})

					directMessageParticipantCollection.insert({
						id: DirectMessageParticipantId.make(uuid()),
						channelId,
						userId: otherUserId,
						organizationId,
					})

					const targetUser = organizationUsers?.find((u) => u?.id === value.userIds[0])
					toast.success(`Started conversation with ${targetUser?.firstName}`)
				} else {
					// Group DM
					// TODO: NOT GONNA WORK NEEDS TRANSACTION
					const _test = channelCollection.insert({
						id: channelId,
						name: "",
						type: "direct",
						organizationId,
						parentChannelId: null,
						createdAt: new Date(),
						updatedAt: null,
						deletedAt: null,
					})

					// Add all participants including current user
					const allUserIds = [user?.id as UserId, ...value.userIds.map((id) => id as UserId)]

					for (const userId of allUserIds) {
						channelMemberCollection.insert({
							id: ChannelMemberId.make(uuid()),
							channelId,
							userId,
							isHidden: false,
							isMuted: false,
							isFavorite: false,
							lastSeenMessageId: null,
							notificationCount: 0,
							joinedAt: new Date(),
							createdAt: new Date(),
							deletedAt: null,
						})
					}

					toast.success(`Created group conversation with ${value.userIds.length} people`)
				}

				onOpenChange(false)

				// Reset form
				form.reset()
				setSelectedUsers([])
				setSearchQuery("")

				// Navigate to the chat
				navigate({
					to: "/$orgId/chat/$id",
					params: { orgId: organizationId, id: channelId },
				})
			} catch (error) {
				console.error("Failed to create DM channel:", error)
				toast.error("Failed to start conversation")
			}
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
															isUserOnline(user?.id || "")
																? "online"
																: "offline"
														}
													/>
													<div className="flex flex-col">
														<p className="font-medium text-primary text-sm">
															{user?.firstName || ""} {user?.lastName || ""}
														</p>
														{isUserOnline(user?.id || "") && (
															<span className="text-success text-xs">
																Active now
															</span>
														)}
													</div>
												</div>
												{selectedUsers.some((u) => u.id === user?.id) && (
													<IconCheckTickCircle className="size-5 text-brand" />
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
