import { DotsHorizontal } from "@untitledui/icons"
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
import IconPhone2 from "../icons/IconPhone2"
import IconStar from "../icons/IconStar"
import { IconNotification } from "../application/notifications/notifications"

interface UserProfilePopoverProps {
	user: {
		_id?: string
		firstName: string
		lastName: string
		email?: string
		avatarUrl?: string
	}
	isOwnProfile: boolean
	isFavorite?: boolean
	isMuted?: boolean
	onInviteToChannel: () => void
	onEditProfile?: () => void
	onViewFullProfile?: () => void
	onToggleMute?: () => void
	onToggleFavorite?: () => void
	onCopyUserId?: () => void
}

export function UserProfilePopover({
	user,
	isOwnProfile,
	isFavorite = false,
	isMuted = false,
	onInviteToChannel,
	onEditProfile,
	onViewFullProfile,
	onToggleMute,
	onToggleFavorite,
	onCopyUserId,
}: UserProfilePopoverProps) {
	const fullName = `${user.firstName} ${user.lastName}`

	return (
		<DialogTrigger>
			<Button className="outline-hidden">
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
					{({ close }) => (
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
												onClick={() => {
													onToggleFavorite?.()
													toast.custom((t) => (
														<IconNotification
															title={isFavorite ? "Removed from favorites" : "Added to favorites"}
															description={isFavorite ? `${fullName} has been removed from your favorites.` : `${fullName} has been added to your favorites.`}
															color="success"
															onClose={() => toast.dismiss(t)}
														/>
													))
												}}
												color={isFavorite ? "secondary" : "tertiary"}
												size="xs"
												icon={IconStar}
												aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
											/>
										</Tooltip>

										<Tooltip arrow title="Call user" placement="bottom">
											<ButtonUtility
												onClick={() => {
													close()
													onInviteToChannel()
												}}
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
														<Dropdown.Item onAction={onViewFullProfile}>
															View full profile
														</Dropdown.Item>
													</Dropdown.Section>
													<Dropdown.Separator />
													<Dropdown.Section>
														<Dropdown.Item onAction={() => {
															onToggleMute?.()
															toast.custom((t) => (
																<IconNotification
																	title={isMuted ? "Unmuted" : "Muted"}
																	description={isMuted ? `You will now receive notifications from ${fullName}.` : `You will no longer receive notifications from ${fullName}.`}
																	color="success"
																	onClose={() => toast.dismiss(t)}
																/>
															))
														}}>
															{isMuted ? "Unmute" : "Mute"}
														</Dropdown.Item>
													</Dropdown.Section>
													<Dropdown.Separator />
													<Dropdown.Item onAction={() => {
														if (user._id) {
															navigator.clipboard.writeText(user._id)
															toast.custom((t) => (
																<IconNotification
																	title="User ID copied!"
																	description="User ID has been copied to your clipboard."
																	color="success"
																	onClose={() => toast.dismiss(t)}
																/>
															))
															onCopyUserId?.()
														}
														}}>
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
												onClick={onEditProfile}
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