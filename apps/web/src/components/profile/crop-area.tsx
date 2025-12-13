import { forwardRef, useImperativeHandle, useRef } from "react"
import { useCropInteraction } from "~/hooks/use-crop-interaction"
import { cx } from "~/utils/cx"
import type { CropRect } from "~/utils/image-crop"

export interface CropAreaHandle {
	getCropRect: () => CropRect
}

interface CropAreaProps {
	imageSrc: string
	imageWidth: number
	imageHeight: number
	initialCrop: CropRect
}

export const CropArea = forwardRef<CropAreaHandle, CropAreaProps>(function CropArea(
	{ imageSrc, imageWidth, imageHeight, initialCrop },
	ref,
) {
	const containerRef = useRef<HTMLDivElement>(null)

	// Calculate display dimensions to fit container while maintaining aspect ratio
	// Container max is roughly 400px for the modal body
	const maxDisplaySize = 400
	const aspectRatio = imageWidth / imageHeight
	let displayWidth: number
	let displayHeight: number

	if (aspectRatio >= 1) {
		// Landscape or square
		displayWidth = Math.min(imageWidth, maxDisplaySize)
		displayHeight = displayWidth / aspectRatio
	} else {
		// Portrait
		displayHeight = Math.min(imageHeight, maxDisplaySize)
		displayWidth = displayHeight * aspectRatio
	}

	const displayScale = displayWidth / imageWidth

	const { cropRect, isDragging, handlePointerDown } = useCropInteraction({
		initialCrop,
		imageWidth,
		imageHeight,
		displayScale,
	})

	// Expose getCropRect method to parent via ref
	useImperativeHandle(ref, () => ({
		getCropRect: () => cropRect,
	}))

	// Convert image coordinates to display coordinates
	const displayCrop = {
		x: cropRect.x * displayScale,
		y: cropRect.y * displayScale,
		size: cropRect.size * displayScale,
	}

	return (
		<div
			ref={containerRef}
			className="relative mx-auto touch-none select-none"
			style={{ width: displayWidth, height: displayHeight }}
		>
			{/* Source image */}
			<img
				src={imageSrc}
				alt="Crop preview"
				className="absolute inset-0 size-full object-contain"
				draggable={false}
			/>

			{/* Dark overlay with transparent crop window (four-div approach) */}
			{/* Top */}
			<div className="absolute top-0 right-0 left-0 bg-black/60" style={{ height: displayCrop.y }} />
			{/* Bottom */}
			<div
				className="absolute right-0 bottom-0 left-0 bg-black/60"
				style={{ height: displayHeight - displayCrop.y - displayCrop.size }}
			/>
			{/* Left */}
			<div
				className="absolute left-0 bg-black/60"
				style={{
					top: displayCrop.y,
					height: displayCrop.size,
					width: displayCrop.x,
				}}
			/>
			{/* Right */}
			<div
				className="absolute right-0 bg-black/60"
				style={{
					top: displayCrop.y,
					height: displayCrop.size,
					width: displayWidth - displayCrop.x - displayCrop.size,
				}}
			/>

			{/* Crop area border and move handle */}
			<div
				className={cx(
					"absolute border-2 border-white",
					isDragging ? "cursor-grabbing" : "cursor-grab",
				)}
				style={{
					left: displayCrop.x,
					top: displayCrop.y,
					width: displayCrop.size,
					height: displayCrop.size,
				}}
				onPointerDown={(e) => handlePointerDown(e, "move")}
			>
				{/* Grid lines for rule of thirds */}
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute top-1/3 right-0 left-0 h-px bg-white/30" />
					<div className="absolute top-2/3 right-0 left-0 h-px bg-white/30" />
					<div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
					<div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />
				</div>
			</div>

			{/* Corner resize handles */}
			<ResizeHandle
				position="nw"
				displayCrop={displayCrop}
				onPointerDown={(e) => handlePointerDown(e, "resize-nw")}
			/>
			<ResizeHandle
				position="ne"
				displayCrop={displayCrop}
				onPointerDown={(e) => handlePointerDown(e, "resize-ne")}
			/>
			<ResizeHandle
				position="sw"
				displayCrop={displayCrop}
				onPointerDown={(e) => handlePointerDown(e, "resize-sw")}
			/>
			<ResizeHandle
				position="se"
				displayCrop={displayCrop}
				onPointerDown={(e) => handlePointerDown(e, "resize-se")}
			/>
		</div>
	)
})

interface ResizeHandleProps {
	position: "nw" | "ne" | "sw" | "se"
	displayCrop: { x: number; y: number; size: number }
	onPointerDown: (e: React.PointerEvent) => void
}

function ResizeHandle({ position, displayCrop, onPointerDown }: ResizeHandleProps) {
	const handleSize = 12
	const offset = -handleSize / 2

	const positionStyles: Record<typeof position, React.CSSProperties> = {
		nw: {
			left: displayCrop.x + offset,
			top: displayCrop.y + offset,
			cursor: "nwse-resize",
		},
		ne: {
			left: displayCrop.x + displayCrop.size + offset,
			top: displayCrop.y + offset,
			cursor: "nesw-resize",
		},
		sw: {
			left: displayCrop.x + offset,
			top: displayCrop.y + displayCrop.size + offset,
			cursor: "nesw-resize",
		},
		se: {
			left: displayCrop.x + displayCrop.size + offset,
			top: displayCrop.y + displayCrop.size + offset,
			cursor: "nwse-resize",
		},
	}

	return (
		<div
			className="absolute size-3 rounded-sm bg-white shadow-md"
			style={positionStyles[position]}
			onPointerDown={onPointerDown}
		/>
	)
}
