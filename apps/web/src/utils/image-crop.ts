/**
 * Image cropping utilities using native Canvas API
 */

export interface CropRect {
	x: number // left offset in image pixels
	y: number // top offset in image pixels
	size: number // width and height (square)
}

/**
 * Crops an image to the specified rectangle and outputs at target dimensions
 */
export async function cropImage(
	image: HTMLImageElement,
	cropRect: CropRect,
	outputSize: number,
): Promise<Blob> {
	const canvas = document.createElement("canvas")
	canvas.width = outputSize
	canvas.height = outputSize

	const ctx = canvas.getContext("2d")
	if (!ctx) {
		throw new Error("Could not get canvas context")
	}

	// Draw the cropped portion scaled to output size
	ctx.drawImage(
		image,
		cropRect.x, // source x
		cropRect.y, // source y
		cropRect.size, // source width
		cropRect.size, // source height
		0, // dest x
		0, // dest y
		outputSize, // dest width
		outputSize, // dest height
	)

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob)
				} else {
					reject(new Error("Failed to create blob from canvas"))
				}
			},
			"image/webp",
			0.9, // Quality
		)
	})
}

/**
 * Calculates the initial crop rectangle (largest centered square)
 */
export function calculateInitialCrop(imageWidth: number, imageHeight: number): CropRect {
	const size = Math.min(imageWidth, imageHeight)
	const x = Math.floor((imageWidth - size) / 2)
	const y = Math.floor((imageHeight - size) / 2)

	return { x, y, size }
}

/**
 * Clamps crop rect within image bounds while maintaining square aspect ratio
 */
export function clampCropRect(
	rect: CropRect,
	imageWidth: number,
	imageHeight: number,
	minSize = 50,
): CropRect {
	// Ensure size is within bounds
	const maxSize = Math.min(imageWidth, imageHeight)
	const size = Math.max(minSize, Math.min(rect.size, maxSize))

	// Clamp position to keep crop within image bounds
	const x = Math.max(0, Math.min(rect.x, imageWidth - size))
	const y = Math.max(0, Math.min(rect.y, imageHeight - size))

	return { x, y, size }
}
