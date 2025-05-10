import { Format } from "@ark-ui/solid"
import { type Accessor, For, Show, createEffect, createSignal } from "solid-js"
import type { Message } from "~/lib/hooks/data/use-chat-messages"
import { IconCopy } from "../icons/copy"
import { IconDownload } from "../icons/download"
import { IconLink } from "../icons/link"
import { IconOpenLink } from "../icons/open-link"
import { IconCircleXSolid } from "../icons/solid/circle-x-solid"
import { Avatar } from "../ui/avatar"
import { Button } from "../ui/button"
import { toaster } from "../ui/toaster"
import { Tooltip } from "../ui/tooltip"

interface ImageViewerModalProps {
	selectedImage: Accessor<string | null>
	setSelectedImage: (image: string | null) => void
	author: Message["author"]
	createdAt: number
	bucketUrl: string
}

export function ImageViewerModal(props: ImageViewerModalProps) {
	const [isVisible, setIsVisible] = createSignal(true)

	// Set visibility after component mounts to trigger animation
	createEffect(() => {
		if (props.selectedImage()) {
			setTimeout(() => setIsVisible(true), 10)
		}
	})

	// Reset visibility when image changes
	const handleClose = () => {
		setIsVisible(false)
		setTimeout(() => props.setSelectedImage(null), 300) // Match transition duration
	}

	const imageModalActions = [
		{
			label: "Download",
			icon: <IconDownload />,
			onClick: async (e: MouseEvent) => {
				e.stopPropagation()
				const imageUrl = props.selectedImage()?.startsWith("https")
					? props.selectedImage()!
					: `${props.bucketUrl}/${props.selectedImage()}`
				try {
					const response = await fetch(imageUrl)
					const blob = await response.blob()
					const url = URL.createObjectURL(blob)
					const a = document.createElement("a")
					a.href = url
					a.download = props.selectedImage()!
					a.click()
					URL.revokeObjectURL(url)
				} catch (error) {
					console.error("Failed to download image:", error)
				}

				toaster.create({
					title: "Image downloaded",
					description: "Your image has been downloaded.",
					type: "success",
				})
			},
		},
		{
			label: "Copy Image",
			icon: <IconCopy />,
			onClick: async (e: MouseEvent) => {
				e.stopPropagation()
				const imageUrl = props.selectedImage()?.startsWith("https")
					? props.selectedImage()!
					: `${props.bucketUrl}/${props.selectedImage()}`
				try {
					const response = await fetch(imageUrl)
					const blob = await response.blob()
					await navigator.clipboard.write([
						new ClipboardItem({
							[blob.type]: blob,
						}),
					])
				} catch (error) {
					console.error("Failed to copy image:", error)
				}

				toaster.create({ title: "Image copied", description: "Your image has been copied.", type: "success" })
			},
		},
		{
			label: "Copy Image URL",
			icon: <IconLink />,
			onClick: (e: MouseEvent) => {
				e.stopPropagation()
				navigator.clipboard.writeText(`${props.bucketUrl}/${props.selectedImage()}`)

				toaster.create({
					title: "Image URL copied",
					description: "Your image URL has been copied.",
					type: "success",
				})
			},
		},
		{
			label: "Open in Browser",
			icon: <IconOpenLink />,
			onClick: (e: MouseEvent) => {
				e.stopPropagation()
				window.open(`${props.bucketUrl}/${props.selectedImage()}`, "_blank")
			},
		},
		{
			label: "Close",
			icon: <IconCircleXSolid />,
			onClick: (e: MouseEvent) => {
				e.stopPropagation()
				props.setSelectedImage(null)
			},
		},
	]

	return (
		<Show when={props.selectedImage()}>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
			<div
				class="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black/80 transition-opacity duration-300 ease-in-out"
				style={{ opacity: isVisible() ? "1" : "0.4" }}
				onClick={handleClose}
			>
				<div class="absolute top-3 left-5 flex items-center gap-2">
					<Avatar src={props.author?.avatarUrl} name={props.author?.displayName!} />
					<div class="flex flex-col">
						<span class="text-sm">{props.author?.displayName}</span>

						<span class="text-muted-foreground text-xs">
							<Format.RelativeTime value={new Date(props.createdAt)} />
						</span>
					</div>
				</div>
				{/* Keep aspect ratio */}
				<div
					class="max-h-[90vh] max-w-[90vw] transition-transform duration-300 ease-in"
					style={{
						transform: isVisible() ? "scale(1)" : "scale(0.1)",
					}}
				>
					<img
						src={
							props.selectedImage()?.startsWith("https")
								? props.selectedImage()!
								: `${props.bucketUrl}/${props.selectedImage()}`
						}
						alt={props.selectedImage()!}
						class="max-h-[90vh] max-w-[90vw] rounded-md"
					/>
				</div>

				<div class="absolute top-3 right-5">
					<For each={imageModalActions}>
						{(action) => (
							<Tooltip openDelay={0} closeDelay={0}>
								<Tooltip.Trigger>
									<Button intent="ghost" size="square" onClick={(e) => action.onClick(e)}>
										{action.icon}
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>{action.label}</Tooltip.Content>
							</Tooltip>
						)}
					</For>
				</div>
			</div>
		</Show>
	)
}
