import type { UserId } from "@hazel/db/schema"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { DotsHorizontal } from "@untitledui/icons"
import { useState } from "react"
import { Button, DialogTrigger, Dialog as PrimitiveDialog } from "react-aria-components"
import { toast } from "sonner"
import { Avatar } from "~/components/base/avatar/avatar"
import { Button as StyledButton } from "~/components/base/buttons/button"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import { Popover } from "~/components/base/select/popover"
import { TextArea } from "~/components/base/textarea/textarea"
import { Tooltip } from "~/components/base/tooltip/tooltip"
import IconPencilEdit from "~/components/icons/IconPencilEdit"
import { userCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"
import { IconNotification } from "../application/notifications/notifications"
import IconPhone2 from "../icons/IconPhone2"
import IconStar from "../icons/IconStar"

interface UserProfilePopoverProps {
	userId: UserId
}

export function UserProfilePopover({ userId }: UserProfilePopoverProps) {
	const { user: currentUser } = useAuth()
	const { data } = useLiveQuery((q) => q.from({ user: userCollection }).where((q) => eq(q.user.id, userId)))
	const user = data[0]

	// Internal state for user interactions
	const [isFavorite, setIsFavorite] = useState(false)
	const [isMuted, setIsMuted] = useState(false)

	if (!user) return null

	const isOwnProfile = currentUser?.id === userId
	const fullName = `${user.firstName} ${user.lastName}`

	const handleCopyUserId = () => {
		navigator.clipboard.writeText(user.id)
		toast.custom((t) => (
			<IconNotification
				title="User ID copied!"
				description="User ID has been copied to your clipboard."
				color="success"
				onClose={() => toast.dismiss(t)}
			/>
		))
	}

	const handleToggleFavorite = () => {
		setIsFavorite(!isFavorite)
		toast.custom((t) => (
			<IconNotification
				title={isFavorite ? "Removed from favorites" : "Added to favorites"}
				description={
					isFavorite
						? `${fullName} has been removed from your favorites.`
						: `${fullName} has been added to your favorites.`
				}
				color="success"
				onClose={() => toast.dismiss(t)}
			/>
		))
	}

	const handleToggleMute = () => {
		setIsMuted(!isMuted)
		toast.custom((t) => (
			<IconNotification
				title={isMuted ? "Unmuted" : "Muted"}
				description={
					isMuted
						? `You will now receive notifications from ${fullName}.`
						: `You will no longer receive notifications from ${fullName}.`
				}
				color="success"
				onClose={() => toast.dismiss(t)}
			/>
		))
	}

	const handleCall = () => {
		// TODO: Implement actual calling functionality
		toast.custom((t) => (
			<IconNotification
				title="Calling..."
				description={`Starting call with ${fullName}`}
				color="default"
				onClose={() => toast.dismiss(t)}
			/>
		))
	}

	return (
		<DialogTrigger>
			<Button className="size-fit outline-hidden">
				<Avatar size="md" alt={fullName} src={user.avatarUrl} />
			</Button>
			<Popover
				className="max-h-96! w-72 bg-secondary py-0 lg:w-80"
				size="md"
				offset={16}
				crossOffset={10}
				placement="right top"
			>
				<PrimitiveDialog className="outline-hidden">
					{() => (
						<>
							{/* user background image */}
							<div className="relative h-32">
								{!isOwnProfile && (
									<div className="absolute top-2 right-2 flex items-center gap-2 p-1">
										<Tooltip
											arrow
											title={isFavorite ? "Remove from favorites" : "Add to favorites"}
											placement="bottom"
										>
											<ButtonUtility
												onClick={handleToggleFavorite}
												color={isFavorite ? "secondary" : "tertiary"}
												size="xs"
												icon={IconStar}
												aria-label={
													isFavorite ? "Remove from favorites" : "Add to favorites"
												}
											/>
										</Tooltip>

										<Tooltip arrow title="Call user" placement="bottom">
											<ButtonUtility
												onClick={handleCall}
												color="tertiary"
												size="xs"
												icon={IconPhone2}
												aria-label="Call user"
											/>
										</Tooltip>

										<Dropdown.Root>
											<ButtonUtility
												className="group"
												color="tertiary"
												size="xs"
												icon={DotsHorizontal}
												aria-label="More"
											/>

											<Dropdown.Popover className="w-40">
												<Dropdown.Menu>
													<Dropdown.Section>
														<Dropdown.Item onAction={handleToggleMute}>
															{isMuted ? "Unmute" : "Mute"}
														</Dropdown.Item>
													</Dropdown.Section>
													<Dropdown.Separator />
													<Dropdown.Item onAction={handleCopyUserId}>
														Copy user ID
													</Dropdown.Item>
												</Dropdown.Menu>
											</Dropdown.Popover>
										</Dropdown.Root>
									</div>
								)}
							</div>

							<div className="inset-shadow-2xs inset-shadow-gray-500/15 rounded-t-lg bg-tertiary p-4">
								<div className="-mt-12">
									<Avatar
										size="xl"
										className="inset-ring inset-ring-tertiary ring-6 ring-bg-primary"
										alt={fullName}
										src={user.avatarUrl}
									/>
									<div className="mt-3 flex flex-col">
										<span className="font-semibold">{user ? fullName : "Unknown"}</span>
										<span className="text-secondary text-xs">{user?.email}</span>
									</div>
								</div>
								<div className="mt-4 flex flex-col gap-y-4">
									<div className="flex items-center gap-2">
										{isOwnProfile ? (
											<StyledButton
												size="sm"
												className="w-full"
												iconLeading={IconPencilEdit}
												onClick={() => {
													// TODO: Implement edit profile functionality
													console.log("Edit profile clicked")
												}}
											>
												Edit profile
											</StyledButton>
										) : (
											<TextArea
												aria-label="Message"
												placeholder={`Message @${user?.firstName}`}
												className="resize-none"
											/>
										)}
									</div>
								</div>
							</div>
						</>
					)}
				</PrimitiveDialog>
			</Popover>
		</DialogTrigger>
	)
}
