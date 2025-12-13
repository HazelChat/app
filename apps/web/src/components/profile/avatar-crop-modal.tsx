import { useEffect, useRef, useState } from "react"
import { Button } from "~/components/ui/button"
import { Loader } from "~/components/ui/loader"
import {
	Modal,
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from "~/components/ui/modal"
import { calculateInitialCrop, cropImage } from "~/utils/image-crop"
import { CropArea, type CropAreaHandle } from "./crop-area"

const OUTPUT_SIZE = 512

interface AvatarCropModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	imageFile: File | null
	onCropComplete: (croppedBlob: Blob) => void
}

export function AvatarCropModal({ isOpen, onOpenChange, imageFile, onCropComplete }: AvatarCropModalProps) {
	const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
	const [imageDimensions, setImageDimensions] = useState<{
		width: number
		height: number
	} | null>(null)
	const [initialCrop, setInitialCrop] = useState<{ x: number; y: number; size: number } | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const objectUrlRef = useRef<string | null>(null)
	const cropAreaRef = useRef<CropAreaHandle>(null)

	// Load image when file changes
	useEffect(() => {
		if (!imageFile) {
			setImageElement(null)
			setImageDimensions(null)
			setInitialCrop(null)
			return
		}

		const url = URL.createObjectURL(imageFile)
		objectUrlRef.current = url

		const img = new Image()
		img.onload = () => {
			setImageElement(img)
			setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
			setInitialCrop(calculateInitialCrop(img.naturalWidth, img.naturalHeight))
		}
		img.onerror = () => {
			console.error("Failed to load image")
			onOpenChange(false)
		}
		img.src = url

		return () => {
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current)
				objectUrlRef.current = null
			}
		}
	}, [imageFile, onOpenChange])

	const handleSave = async () => {
		if (!imageElement || !cropAreaRef.current) return

		const cropRect = cropAreaRef.current.getCropRect()
		setIsProcessing(true)
		try {
			const blob = await cropImage(imageElement, cropRect, OUTPUT_SIZE)
			onCropComplete(blob)
		} catch (error) {
			console.error("Failed to crop image:", error)
		} finally {
			setIsProcessing(false)
		}
	}

	const handleCancel = () => {
		onOpenChange(false)
	}

	const imageSrc = objectUrlRef.current
	const isReady = imageElement && imageDimensions && initialCrop && imageSrc

	return (
		<Modal isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContent size="lg" isDismissable={!isProcessing}>
				<ModalHeader>
					<ModalTitle>Crop profile picture</ModalTitle>
				</ModalHeader>
				<ModalBody className="flex items-center justify-center py-6">
					{isReady ? (
						<CropArea
							ref={cropAreaRef}
							imageSrc={imageSrc}
							imageWidth={imageDimensions.width}
							imageHeight={imageDimensions.height}
							initialCrop={initialCrop}
						/>
					) : (
						<div className="flex h-64 items-center justify-center">
							<Loader className="size-8" />
						</div>
					)}
				</ModalBody>
				<ModalFooter>
					<ModalClose>
						<Button intent="outline" onPress={handleCancel} isDisabled={isProcessing}>
							Cancel
						</Button>
					</ModalClose>
					<Button onPress={handleSave} isDisabled={!isReady || isProcessing}>
						{isProcessing ? (
							<>
								<Loader data-slot="loader" />
								Saving...
							</>
						) : (
							"Save"
						)}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
