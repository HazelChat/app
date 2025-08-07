import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Mail01, MessageSquare02, Plus, UsersPlus } from "@untitledui/icons"
import { type } from "arktype"
import { useMemo, useState } from "react"
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { Avatar } from "~/components/base/avatar/avatar"
import { Button } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Input } from "~/components/base/input/input"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import IconCheckTickCircle from "~/components/icons/IconCheckTickCircle"
import { usePresence } from "~/components/presence/presence-provider"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { useAppForm } from "~/hooks/use-app-form"
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
	const [selectedUsers, setSelectedUsers] = useState<Doc<"users">[]>([])

	const navigate = useNavigate()
	const { orgId } = useParams({ from: "/app/$orgId" })
	const organizationId = orgId as Id<"organizations">
	const { isUserOnline } = usePresence()

	const friendsQuery = useQuery(
		convexQuery(api.social.getFriendsForOrganization, { organizationId })
	)
	const createDmChannelMutation = useConvexMutation(api.channels.createDmChannel)
	const createGroupDmChannelMutation = useConvexMutation(api.channels.createGroupDmChannel)

	const form = useAppForm({
		defaultValues: {
			userIds: [],
		} as DmFormData,
		validators: {
			onChange: dmFormSchema,
		},
		onSubmit: async ({ value }) => {
			if (value.userIds.length === 0) return

			try {
				let channelId: Id<"channels">
				
				if (value.userIds.length === 1) {
					// Single DM
					channelId = await createDmChannelMutation({
						userId: value.userIds[0] as Id<"users">,
						organizationId,
					})
					const user = friendsQuery.data?.find((u) => u?._id === value.userIds[0])
					toast.success(`Started conversation with ${user?.firstName}`)
				} else {
					// Group DM
					channelId = await createGroupDmChannelMutation({
						userIds: value.userIds as Id<"users">[],
						organizationId,
					})
					toast.success(`Created group conversation with ${value.userIds.length} people`)
				}

				onOpenChange(false)

				// Reset form
				form.reset()
				setSelectedUsers([])
				setSearchQuery("")

				// Navigate to the chat
				navigate({
					to: "/app/$orgId/chat/$id",
					params: { orgId: organizationId, id: channelId },
				})
			} catch (error) {
				console.error("Failed to create DM channel:", error)
				toast.error("Failed to start conversation")
			}
		},
	})

	const filteredUsers = useMemo(() => {
		const users = friendsQuery.data || []
		if (!searchQuery.trim()) return users

		const query = searchQuery.toLowerCase()
		const userss = users.filter((user) => {
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

		return userss.filter(Boolean)
	}, [friendsQuery.data, searchQuery])

	const handleClose = () => {
		onOpenChange(false)
		// Reset form and state when closing
		form.reset()
		setSelectedUsers([])
		setSearchQuery("")
	}
	
	const toggleUserSelection = (user: Doc<"users">) => {
		const isSelected = selectedUsers.some((u) => u._id === user._id)
		let newSelection: Doc<"users">[]
		
		if (isSelected) {
			newSelection = selectedUsers.filter((u) => u._id !== user._id)
		} else {
			newSelection = [...selectedUsers, user]
		}
		
		setSelectedUsers(newSelection)
		form.setFieldValue("userIds", newSelection.map((u) => u._id))
	}

	return (
		<AriaDialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalOverlay isDismissable>
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
									<FeaturedIcon
										color="gray"
										size="lg"
										theme="modern"
										icon={MessageSquare02}
									/>
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
											<div className="flex -space-x-2">
												{selectedUsers.slice(0, 3).map((user) => (
													<Avatar
														key={user._id}
														size="xs"
														src={user.avatarUrl}
														initials={`${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`}
														alt={`${user.firstName || ""} ${user.lastName || ""}`}
													/>
												))}
												{selectedUsers.length > 3 && (
													<div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-primary">
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
													key={user?._id}
													type="button"
													onClick={() => user && toggleUserSelection(user)}
													className={cx(
														"flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-secondary",
														selectedUsers.some((u) => u._id === user?._id) &&
															"bg-secondary ring-1 ring-border-brand ring-inset",
													)}
												>
													<div className="flex items-center gap-3">
														<Avatar
															size="sm"
															src={user?.avatarUrl}
															initials={`${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`}
															alt={`${user?.firstName || ""} ${user?.lastName || ""}`}
															status={
																isUserOnline(user?._id || "")
																	? "online"
																	: "offline"
															}
														/>
														<div className="flex flex-col">
															<p className="font-medium text-primary text-sm">
																{user?.firstName || ""} {user?.lastName || ""}
															</p>
															{isUserOnline(user?._id || "") && (
																<span className="text-success text-xs">
																	Active now
																</span>
															)}
														</div>
													</div>
													{selectedUsers.some((u) => u._id === user?._id) && (
														<IconCheckTickCircle className="size-5 text-brand" />
													)}
												</button>
											))}
										</div>
									)}
								</div>
							</div>
							<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
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
							</div>
						</div>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</AriaDialogTrigger>
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
