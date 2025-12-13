import { type ChangeEvent, useRef, useState } from "react"
import { toast } from "sonner"
import IconEdit from "~/components/icons/icon-edit"
import { Avatar } from "~/components/ui/avatar/avatar"
import { Loader } from "~/components/ui/loader"
import { useProfilePictureUpload } from "~/hooks/use-profile-picture-upload"
import { cx } from "~/utils/cx"
import { AvatarCropModal } from "./avatar-crop-modal"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface ProfilePictureUploadProps {
	currentAvatarUrl?: string | null
	userId: string
	userInitials?: string
	className?: string
}

export function ProfilePictureUpload({
	currentAvatarUrl,
	userId: _userId,
	userInitials,
	className,
}: ProfilePictureUploadProps) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { uploadProfilePicture, isUploading, uploadProgress } = useProfilePictureUpload()
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isCropModalOpen, setIsCropModalOpen] = useState(false)

	const handleClick = () => {
		if (!isUploading) {
			fileInputRef.current?.click()
		}
	}

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Reset input so the same file can be selected again
		event.target.value = ""

		// Validate file type
		if (!ALLOWED_TYPES.includes(file.type)) {
			toast.error("Invalid file type", {
				description: "Please select a JPEG, PNG, or WebP image",
			})
			return
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			toast.error("File too large", {
				description: "Image must be less than 5MB",
			})
			return
		}

		// Open crop modal with the selected file
		setSelectedFile(file)
		setIsCropModalOpen(true)
	}

	const handleCropComplete = async (croppedBlob: Blob) => {
		setIsCropModalOpen(false)

		// Convert Blob to File for existing upload function
		const croppedFile = new File([croppedBlob], "avatar.webp", { type: "image/webp" })
		await uploadProfilePicture(croppedFile)

		setSelectedFile(null)
	}

	const handleCropModalOpenChange = (open: boolean) => {
		setIsCropModalOpen(open)
		if (!open) {
			setSelectedFile(null)
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

			{/* Clickable avatar container - size-24 matches Avatar 4xl */}
			<div
				role="button"
				tabIndex={0}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				className={cx(
					"group relative size-24 cursor-pointer rounded-xl transition-all duration-200",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
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
					className="transition-all duration-200"
				/>

				{/* Hover overlay with edit icon / uploading state */}
				<div
					className={cx(
						"absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 transition-opacity duration-200",
						isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
					)}
					style={{
						// @ts-expect-error CSS property
						cornerShape: "squircle",
					}}
				>
					{isUploading ? (
						<div className="flex flex-col items-center gap-2">
							<Loader className="size-6 text-white drop-shadow-md" />
							<span className="font-medium text-white text-xs drop-shadow-md">
								Uploading...
							</span>
						</div>
					) : (
						<div className="flex flex-col items-center gap-1">
							<IconEdit className="size-6 text-white drop-shadow-md" />
							<span className="font-medium text-white text-xs drop-shadow-md">Edit</span>
						</div>
					)}
				</div>

				{/* Linear progress bar at bottom */}
				{isUploading && (
					<div className="absolute right-0 bottom-0 left-0 h-1 overflow-hidden rounded-b-xl bg-white/20">
						<div
							className="h-full bg-white transition-[width] duration-150"
							style={{ width: `${uploadProgress}%` }}
						/>
					</div>
				)}
			</div>

			{/* Helper text */}
			<p className="mt-2 text-center text-muted-fg text-xs">Click to upload</p>

			{/* Avatar cropping modal */}
			<AvatarCropModal
				isOpen={isCropModalOpen}
				onOpenChange={handleCropModalOpenChange}
				imageFile={selectedFile}
				onCropComplete={handleCropComplete}
			/>
		</div>
	)
}
