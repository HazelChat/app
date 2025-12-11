import { useRef, type ChangeEvent } from "react"
import IconEdit from "~/components/icons/icon-edit"
import { Avatar } from "~/components/ui/avatar/avatar"
import { Loader } from "~/components/ui/loader"
import { useProfilePictureUpload } from "~/hooks/use-profile-picture-upload"
import { cx } from "~/utils/cx"

interface ProfilePictureUploadProps {
	currentAvatarUrl?: string | null
	userId: string
	userInitials?: string
	className?: string
}

export function ProfilePictureUpload({
	currentAvatarUrl,
	userId,
	userInitials,
	className,
}: ProfilePictureUploadProps) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { uploadProfilePicture, isUploading } = useProfilePictureUpload()

	const handleClick = () => {
		if (!isUploading) {
			fileInputRef.current?.click()
		}
	}

	const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (file) {
			await uploadProfilePicture(file)
			// Reset input so the same file can be selected again
			event.target.value = ""
		}
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault()
			handleClick()
		}
	}

	return (
		<div className={cx("relative inline-block", className)}>
			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={handleFileChange}
				className="sr-only"
				aria-label="Upload profile picture"
			/>

			{/* Clickable avatar container */}
			<div
				role="button"
				tabIndex={0}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				className={cx(
					"group relative cursor-pointer rounded-xl transition-all duration-200",
					"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
					isUploading && "pointer-events-none",
				)}
				style={{
					// @ts-expect-error CSS property
					cornerShape: "squircle",
				}}
				aria-label="Change profile picture"
				aria-busy={isUploading}
			>
				{/* Avatar */}
				<Avatar
					src={currentAvatarUrl}
					alt="Your profile picture"
					initials={userInitials}
					size="4xl"
					className={cx(
						"transition-all duration-200",
						!isUploading && "group-hover:brightness-75",
					)}
				/>

				{/* Hover overlay with edit icon */}
				<div
					className={cx(
						"absolute inset-0 flex items-center justify-center rounded-xl transition-opacity duration-200",
						isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
					)}
					style={{
						// @ts-expect-error CSS property
						cornerShape: "squircle",
					}}
				>
					{isUploading ? (
						<Loader className="size-6 text-white drop-shadow-md" />
					) : (
						<div className="flex flex-col items-center gap-1">
							<IconEdit className="size-6 text-white drop-shadow-md" />
							<span className="font-medium text-white text-xs drop-shadow-md">Edit</span>
						</div>
					)}
				</div>
			</div>

			{/* Helper text */}
			<p className="mt-2 text-center text-muted-fg text-xs">
				Click to upload
			</p>

			{/* TODO: Add cropping modal here (build from scratch, no library) */}
		</div>
	)
}
