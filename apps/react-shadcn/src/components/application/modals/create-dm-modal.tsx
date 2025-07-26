import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import type { Doc, Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Mail01, MessageSquare02, Plus } from "@untitledui/icons"
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
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { cx } from "~/utils/cx"

interface CreateDmModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export const CreateDmModal = ({ isOpen, onOpenChange }: CreateDmModalProps) => {
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedUser, setSelectedUser] = useState<Doc<"users"> | null>(null)
	const [isCreating, setIsCreating] = useState(false)

	const navigate = useNavigate()

	// Get organization members
	const friendsQuery = useQuery(convexQuery(api.social.getFriendsForOrganization, {}))
	const createDmChannelMutation = useConvexMutation(api.channels.createDmChannelForOrganization)

	// Filter users based on search query
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

	const handleCreateDm = async () => {
		if (!selectedUser) {
			toast.error("Please select a user to message")
			return
		}

		setIsCreating(true)
		try {
			const channelId = await createDmChannelMutation({
				userId: selectedUser._id as Id<"users">,
			})

			toast.success(`Started conversation with ${selectedUser.firstName}`)
			onOpenChange(false)

			// Reset state
			setSelectedUser(null)
			setSearchQuery("")

			// Navigate to the chat
			navigate({
				to: "/app/chat/$id",
				params: { id: channelId },
			})
		} catch (error) {
			console.error("Failed to create DM channel:", error)
			toast.error("Failed to start conversation")
		} finally {
			setIsCreating(false)
		}
	}

	const handleClose = () => {
		onOpenChange(false)
		// Reset state when closing
		setSelectedUser(null)
		setSearchQuery("")
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
										Start a direct message
									</AriaHeading>
									<p className="text-sm text-tertiary">
										Select a team member to start a conversation
									</p>
								</div>
							</div>
							<div className="h-5 w-full" />
							<div className="flex flex-col gap-4 px-4 sm:px-6">
								{/* Search Input */}
								<Input
									size="md"
									placeholder="Search team members..."
									icon={Mail01}
									value={searchQuery}
									onChange={setSearchQuery}
								/>

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
													onClick={() => setSelectedUser(user)}
													className={cx(
														"flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-secondary",
														selectedUser?._id === user?._id &&
															"bg-secondary ring-1 ring-border-brand ring-inset",
													)}
												>
													<div className="flex items-center gap-3">
														<Avatar
															size="sm"
															src={user?.avatarUrl}
															initials={`${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`}
															alt={`${user?.firstName || ""} ${user?.lastName || ""}`}
														/>
														<div className="flex flex-col">
															<p className="font-medium text-primary text-sm">
																{user?.firstName || ""} {user?.lastName || ""}
															</p>
															{user?.status === "online" && (
																<span className="text-success text-xs">
																	Active now
																</span>
															)}
														</div>
													</div>
													{selectedUser?._id === user?._id && (
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
									isDisabled={isCreating}
								>
									Cancel
								</Button>
								<Button
									color="primary"
									size="lg"
									onClick={handleCreateDm}
									isDisabled={!selectedUser || isCreating}
								>
									{isCreating ? "Creating..." : "Start conversation"}
								</Button>
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
