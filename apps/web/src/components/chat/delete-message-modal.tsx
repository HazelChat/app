import { Heading as AriaHeading } from "react-aria-components"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import IconTrash from "../icons/icon-trash"

interface DeleteMessageModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

export const DeleteMessageModal = ({ isOpen, onOpenChange, onConfirm }: DeleteMessageModalProps) => {
	const handleDelete = () => {
		onConfirm()
		onOpenChange(false)
	}

	return (
		<ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange}>
			<Modal>
				<Dialog>
					<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-100">
						<CloseButton
							onClick={() => onOpenChange(false)}
							theme="light"
							size="lg"
							className="absolute top-3 right-3"
						/>
						<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
							<div className="relative w-max">
								<FeaturedIcon color="error" size="lg" theme="light" icon={IconTrash} />

								<BackgroundPattern
									pattern="circle"
									size="sm"
									className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
								/>
							</div>
							<div className="z-10 flex flex-col gap-0.5">
								<AriaHeading slot="title" className="font-semibold text-md text-primary">
									Delete message
								</AriaHeading>
								<p className="text-sm text-tertiary">
									Are you sure you want to delete this message? This action cannot be
									undone.
								</p>
							</div>
						</div>
						<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
							<Button color="secondary" size="lg" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button color="primary-destructive" size="lg" onClick={handleDelete}>
								Delete
							</Button>
						</div>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
