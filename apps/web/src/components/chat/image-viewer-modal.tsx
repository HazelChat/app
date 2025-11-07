import type { Attachment, User } from "@hazel/db/models"
import {
	ArrowDownTrayIcon,
	ArrowTopRightOnSquareIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/solid"
import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import IconClose from "~/components/icons/icon-close"
import IconCopy from "~/components/icons/icon-copy"
import { Avatar } from "~/components/ui/avatar/avatar"
import { Button } from "~/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"

interface ImageViewerModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	images: Array<typeof Attachment.Model.Type>
	initialIndex: number
	author?: typeof User.Model.Type
	createdAt: number
}

export function ImageViewerModal({
	isOpen,
	onOpenChange,
	images,
	initialIndex,
	author,
	createdAt,
}: ImageViewerModalProps) {
	const [selectedIndex, setSelectedIndex] = useState(initialIndex)
	const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: initialIndex, loop: false })
	const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
		containScroll: "keepSnaps",
		dragFree: true,
	})

	const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL || "https://cdn.hazel.sh"

	// Update selected index when embla scrolls
	useEffect(() => {
		if (!emblaApi) return

		const onSelect = () => {
			setSelectedIndex(emblaApi.selectedScrollSnap())
		}

		emblaApi.on("select", onSelect)
		onSelect()

		return () => {
			emblaApi.off("select", onSelect)
		}
	}, [emblaApi])

	// Sync thumbnail carousel with main carousel
	useEffect(() => {
		if (!emblaApi || !emblaThumbsApi) return

		const onSelect = () => {
			const index = emblaApi.selectedScrollSnap()
			emblaThumbsApi.scrollTo(index)
		}

		emblaApi.on("select", onSelect)
		onSelect()
	}, [emblaApi, emblaThumbsApi])

	// Keyboard navigation
	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChange(false)
			} else if (e.key === "ArrowLeft") {
				e.preventDefault()
				emblaApi?.scrollPrev()
			} else if (e.key === "ArrowRight") {
				e.preventDefault()
				emblaApi?.scrollNext()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isOpen, emblaApi, onOpenChange])

	// Reset to initial index when modal opens
	useEffect(() => {
		if (isOpen && emblaApi) {
			emblaApi.scrollTo(initialIndex, true)
			setSelectedIndex(initialIndex)
		}
	}, [isOpen, initialIndex, emblaApi])

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
	const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

	const currentImage = images[selectedIndex]
	const currentImageUrl = currentImage ? `${publicUrl}/${currentImage.id}` : ""

	const handleDownload = () => {
		if (!currentImage) return

		const link = document.createElement("a")
		link.href = currentImageUrl
		link.download = currentImage.fileName
		link.target = "_blank"
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		toast.success("Image downloaded", {
			description: "Your image has been downloaded.",
		})
	}

	const handleCopyImage = async () => {
		try {
			const response = await fetch(currentImageUrl)
			const blob = await response.blob()
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			])

			toast.success("Image copied", {
				description: "Your image has been copied to clipboard.",
			})
		} catch (error) {
			console.error("Failed to copy image:", error)
			toast.error("Copy failed", {
				description: "Could not copy the image.",
			})
		}
	}

	const handleCopyUrl = () => {
		navigator.clipboard.writeText(currentImageUrl)
		toast.success("URL copied", {
			description: "Image URL has been copied to clipboard.",
		})
	}

	const handleOpenInBrowser = () => {
		window.open(currentImageUrl, "_blank")
	}

	const imageActions = [
		{
			label: "Download",
			icon: ArrowDownTrayIcon,
			onClick: handleDownload,
		},
		{
			label: "Copy Image",
			icon: IconCopy,
			onClick: handleCopyImage,
		},
		{
			label: "Copy URL",
			icon: IconCopy,
			onClick: handleCopyUrl,
		},
		{
			label: "Open in Browser",
			icon: ArrowTopRightOnSquareIcon,
			onClick: handleOpenInBrowser,
		},
		{
			label: "Close",
			icon: IconClose,
			onClick: () => onOpenChange(false),
		},
	]

	if (!isOpen) return null

	const content = (
		// biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			className="fixed inset-0 isolate z-9999 flex items-center justify-center bg-black/90 transition-opacity duration-200"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onOpenChange(false)
				}
			}}
		>
			{/* Author info - top left */}
			{author && (
				<div className="absolute top-5 left-5 flex items-center gap-2">
					<Avatar src={author.avatarUrl} alt={`${author.firstName} ${author.lastName}`} size="md" />
					<div className="flex flex-col">
						<span className="text-sm text-white">
							{author.firstName} {author.lastName}
						</span>
						<span className="text-muted-foreground text-xs">
							{new Date(createdAt).toLocaleString()}
						</span>
					</div>
				</div>
			)}

			{/* Main carousel */}
			<div className="relative mx-36 w-full max-w-[90vw]">
				<div className="overflow-hidden" ref={emblaRef}>
					<div className="flex">
						{images.map((image, _index) => (
							<div
								key={image.id}
								className="flex min-w-0 flex-[0_0_100%] items-center justify-center"
							>
								{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
								<img
									src={`${publicUrl}/${image.id}`}
									alt={image.fileName}
									className="max-h-[70vh] max-w-full rounded-md"
									onClick={(e) => e.stopPropagation()}
								/>
							</div>
						))}
					</div>
				</div>

				{/* Navigation arrows - only show if more than 1 image */}
				{images.length > 1 && (
					<>
						<button
							type="button"
							onClick={scrollPrev}
							className="-translate-y-1/2 absolute top-1/2 left-4 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70"
							aria-label="Previous image"
						>
							<ChevronLeftIcon className="size-6" />
						</button>
						<button
							type="button"
							onClick={scrollNext}
							className="-translate-y-1/2 absolute top-1/2 right-4 rounded-full bg-black/50 p-2 text-white transition-all hover:bg-black/70"
							aria-label="Next image"
						>
							<ChevronRightIcon className="size-6" />
						</button>
					</>
				)}
			</div>

			{/* Image counter - only show if more than 1 image */}
			{images.length > 1 && (
				<div className="-translate-x-1/2 absolute top-5 left-1/2 rounded-md bg-black/50 px-3 py-1.5 text-sm text-white">
					{selectedIndex + 1} of {images.length}
				</div>
			)}

			{/* Action toolbar - top right */}
			<div className="absolute top-5 right-5 flex gap-1 rounded-md border border-white/10 bg-black/50 p-1">
				{imageActions.map((action) => (
					<Tooltip key={action.label}>
						<TooltipTrigger>
							<Button
								intent="plain"
								size="sq-sm"
								onPress={action.onClick}
								className="text-white hover:bg-white/10"
							>
								<action.icon className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{action.label}</TooltipContent>
					</Tooltip>
				))}
			</div>

			{/* Thumbnail strip - only show if more than 1 image */}
			{images.length > 1 && (
				<div className="-translate-x-1/2 absolute bottom-5 left-1/2 w-full max-w-2xl px-8">
					<div className="overflow-hidden rounded-md" ref={emblaThumbsRef}>
						<div className="flex gap-2">
							{images.map((image, index) => (
								<button
									key={image.id}
									type="button"
									onClick={() => scrollTo(index)}
									className={`relative min-w-0 flex-[0_0_80px] cursor-pointer overflow-hidden rounded border-2 transition-all ${
										index === selectedIndex
											? "border-white opacity-100"
											: "border-transparent opacity-50 hover:opacity-75"
									}`}
								>
									<img
										src={`${publicUrl}/${image.id}`}
										alt={image.fileName}
										className="h-16 w-20 object-cover"
									/>
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	)

	return createPortal(content, document.body)
}
