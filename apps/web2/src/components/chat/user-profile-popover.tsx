import { Result, useAtomValue } from "@effect-atom/atom-react"
import type { UserId } from "@hazel/db/schema"
import { PhoneIcon, StarIcon } from "@heroicons/react/20/solid"
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid"
import { useState } from "react"
import { Button as PrimitiveButton } from "react-aria-components"
import { toast } from "sonner"
import { userWithPresenceAtomFamily } from "~/atoms/message-atoms"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { DropdownLabel, DropdownSeparator } from "~/components/ui/dropdown"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "~/components/ui/menu"
import { Popover, PopoverContent } from "~/components/ui/popover"
import { Textarea } from "~/components/ui/textarea"
import { useAuth } from "~/lib/auth"
import { cn } from "~/lib/utils"

interface UserProfilePopoverProps {
	userId: UserId
}

export function UserProfilePopover({ userId }: UserProfilePopoverProps) {
	const { user: currentUser } = useAuth()

	const userPresenceResult = useAtomValue(userWithPresenceAtomFamily(userId))
	const data = Result.getOrElse(userPresenceResult, () => [])
	const result = data[0]
	const user = result?.user
	const presence = result?.presence

	const [isFavorite, setIsFavorite] = useState(false)
	const [isMuted, setIsMuted] = useState(false)

	if (!user) return null

	const isOwnProfile = currentUser?.id === userId
	const fullName = `${user.firstName} ${user.lastName}`

	const handleCopyUserId = () => {
		navigator.clipboard.writeText(user.id)
		toast.success("User ID copied!", {
			description: "User ID has been copied to your clipboard.",
		})
	}

	const handleToggleFavorite = () => {
		setIsFavorite(!isFavorite)
		toast.success(isFavorite ? "Removed from favorites" : "Added to favorites", {
			description: isFavorite
				? `${fullName} has been removed from your favorites.`
				: `${fullName} has been added to your favorites.`,
		})
	}

	const handleToggleMute = () => {
		setIsMuted(!isMuted)
		toast.success(isMuted ? "Unmuted" : "Muted", {
			description: isMuted
				? `You will now receive notifications from ${fullName}.`
				: `You will no longer receive notifications from ${fullName}.`,
		})
	}

	const handleCall = () => {
		toast.info("Calling...", {
			description: `Starting call with ${fullName}`,
		})
	}

	const getStatusColor = (status?: string) => {
		switch (status) {
			case "online":
				return "text-success bg-success"
			case "away":
			case "busy":
				return "text-warning bg-warning"
			case "dnd":
				return "text-danger bg-danger"
			default:
				return "text-muted-fg bg-muted-fg"
		}
	}

	const getStatusLabel = (status?: string) => {
		if (!status) return "Offline"
		return status.charAt(0).toUpperCase() + status.slice(1)
	}

	return (
		<Popover>
			<PrimitiveButton className="size-fit outline-hidden">
				<Avatar size="lg" alt={fullName} src={user.avatarUrl} />
			</PrimitiveButton>
			<PopoverContent placement="right top" className="w-72 p-0 lg:w-80">
				<div className="relative h-32 rounded-t-xl bg-gradient-to-br from-primary/10 to-accent/10">
					{!isOwnProfile && (
						<div className="absolute top-2 right-2 flex items-center gap-2">
							<Button
								size="sq-xs"
								intent={isFavorite ? "secondary" : "outline"}
								onPress={handleToggleFavorite}
								aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
								isCircle
							>
								<StarIcon data-slot="icon" />
							</Button>

							<Button
								size="sq-xs"
								intent="outline"
								onPress={handleCall}
								aria-label="Call user"
								isCircle
							>
								<PhoneIcon data-slot="icon" />
							</Button>

							<Menu>
								<MenuTrigger aria-label="More options">
									<Button size="sq-xs" intent="outline" isCircle>
										<EllipsisVerticalIcon data-slot="icon" />
									</Button>
								</MenuTrigger>

								<MenuContent placement="bottom end">
									<MenuItem onAction={handleToggleMute}>
										<DropdownLabel>{isMuted ? "Unmute" : "Mute"}</DropdownLabel>
									</MenuItem>
									<DropdownSeparator />
									<MenuItem onAction={handleCopyUserId}>
										<DropdownLabel>Copy user ID</DropdownLabel>
									</MenuItem>
								</MenuContent>
							</Menu>
						</div>
					)}
				</div>

				<div className="rounded-t-xl border border-border bg-bg p-4 shadow-md">
					<div className="-mt-16">
						<div className="relative w-fit">
							<Avatar
								size="xl"
								className="ring-4 ring-bg"
								alt={fullName}
								src={user.avatarUrl}
							/>
							{presence?.status && (
								<span
									className={cn(
										"absolute bottom-1 right-1 size-3 rounded-full border-2 border-bg",
										getStatusColor(presence.status),
									)}
								/>
							)}
						</div>
						<div className="mt-3 flex flex-col gap-1">
							<span className="font-semibold text-fg">{user ? fullName : "Unknown"}</span>
							<span className="text-muted-fg text-xs">{user?.email}</span>
							{presence?.status && (
								<span
									className={cn(
										"mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
										getStatusColor(presence.status),
									)}
								>
									<span className="size-1.5 rounded-full bg-current" />
									{getStatusLabel(presence.status)}
								</span>
							)}
							{presence?.customMessage && (
								<span className="mt-1 text-muted-fg text-xs italic">
									"{presence.customMessage}"
								</span>
							)}
						</div>
					</div>
					<div className="mt-4 flex flex-col gap-y-4">
						<div className="flex items-center gap-2">
							{isOwnProfile ? (
								<Button size="sm" className="w-full">
									Edit profile
								</Button>
							) : (
								<Textarea
									aria-label="Message"
									placeholder={`Message @${user?.firstName}`}
									className="resize-none"
								/>
							)}
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
