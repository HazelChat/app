import { useCallback, useEffect, useRef, useState } from "react"
import { type CropRect, clampCropRect } from "~/utils/image-crop"

type DragMode = "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se"

interface UseCropInteractionOptions {
	initialCrop: CropRect
	imageWidth: number
	imageHeight: number
	displayScale: number // ratio of displayed size to actual image size
	minSize?: number
}

interface UseCropInteractionReturn {
	cropRect: CropRect
	setCropRect: (rect: CropRect) => void
	isDragging: boolean
	handlePointerDown: (e: React.PointerEvent, mode: DragMode) => void
}

export function useCropInteraction({
	initialCrop,
	imageWidth,
	imageHeight,
	displayScale,
	minSize = 50,
}: UseCropInteractionOptions): UseCropInteractionReturn {
	const [cropRect, setCropRect] = useState<CropRect>(initialCrop)
	const [isDragging, setIsDragging] = useState(false)

	const dragStateRef = useRef<{
		mode: DragMode
		startX: number
		startY: number
		startCrop: CropRect
	} | null>(null)

	// Update crop rect when initial crop changes (new image loaded)
	useEffect(() => {
		setCropRect(initialCrop)
	}, [initialCrop])

	const handlePointerDown = useCallback(
		(e: React.PointerEvent, mode: DragMode) => {
			e.preventDefault()
			e.stopPropagation()

			dragStateRef.current = {
				mode,
				startX: e.clientX,
				startY: e.clientY,
				startCrop: { ...cropRect },
			}
			setIsDragging(true)

			// Capture pointer for smooth tracking outside element
			;(e.target as HTMLElement).setPointerCapture(e.pointerId)
		},
		[cropRect],
	)

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			if (!dragStateRef.current) return

			const { mode, startX, startY, startCrop } = dragStateRef.current

			// Calculate delta in display coordinates, then convert to image coordinates
			const deltaX = (e.clientX - startX) / displayScale
			const deltaY = (e.clientY - startY) / displayScale

			let newRect: CropRect

			if (mode === "move") {
				newRect = {
					x: startCrop.x + deltaX,
					y: startCrop.y + deltaY,
					size: startCrop.size,
				}
			} else {
				// Resize from corner - maintain square aspect ratio
				// Determine which corner is being dragged
				const isLeft = mode === "resize-nw" || mode === "resize-sw"
				const isTop = mode === "resize-nw" || mode === "resize-ne"

				// Use the larger delta to determine size change (maintains square)
				const absDeltaX = Math.abs(deltaX)
				const absDeltaY = Math.abs(deltaY)
				const sizeDelta = Math.max(absDeltaX, absDeltaY)

				// Determine if we're growing or shrinking based on drag direction
				let growing: boolean
				if (isLeft && isTop) {
					// NW corner: growing when moving up-left (negative deltas)
					growing = deltaX < 0 || deltaY < 0
				} else if (!isLeft && isTop) {
					// NE corner: growing when moving up-right (positive x, negative y)
					growing = deltaX > 0 || deltaY < 0
				} else if (isLeft && !isTop) {
					// SW corner: growing when moving down-left (negative x, positive y)
					growing = deltaX < 0 || deltaY > 0
				} else {
					// SE corner: growing when moving down-right (positive deltas)
					growing = deltaX > 0 || deltaY > 0
				}

				const newSize = growing ? startCrop.size + sizeDelta : startCrop.size - sizeDelta

				// Calculate new position based on which corner is anchored
				let newX = startCrop.x
				let newY = startCrop.y

				if (isLeft) {
					// Left corners: anchor right edge, move left edge
					newX = startCrop.x + startCrop.size - newSize
				}
				if (isTop) {
					// Top corners: anchor bottom edge, move top edge
					newY = startCrop.y + startCrop.size - newSize
				}

				newRect = { x: newX, y: newY, size: newSize }
			}

			// Clamp to valid bounds
			const clampedRect = clampCropRect(newRect, imageWidth, imageHeight, minSize)
			setCropRect(clampedRect)
		},
		[displayScale, imageWidth, imageHeight, minSize],
	)

	const handlePointerUp = useCallback(() => {
		dragStateRef.current = null
		setIsDragging(false)
	}, [])

	// Add global listeners when dragging
	useEffect(() => {
		if (isDragging) {
			window.addEventListener("pointermove", handlePointerMove)
			window.addEventListener("pointerup", handlePointerUp)
			return () => {
				window.removeEventListener("pointermove", handlePointerMove)
				window.removeEventListener("pointerup", handlePointerUp)
			}
		}
	}, [isDragging, handlePointerMove, handlePointerUp])

	return {
		cropRect,
		setCropRect,
		isDragging,
		handlePointerDown,
	}
}
