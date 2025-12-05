import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelWebhookId } from "@hazel/schema"
import { Exit } from "effect"
import { useState } from "react"
import { toast } from "sonner"
import { deleteChannelWebhookMutation } from "~/atoms/channel-webhook-atoms"
import { Button } from "~/components/ui/button"
import { Description } from "~/components/ui/field"
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "~/components/ui/modal"

interface DeleteWebhookDialogProps {
	webhookId: ChannelWebhookId
	webhookName: string
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export function DeleteWebhookDialog({
	webhookId,
	webhookName,
	isOpen,
	onOpenChange,
	onSuccess,
}: DeleteWebhookDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false)

	const deleteWebhook = useAtomSet(deleteChannelWebhookMutation, {
		mode: "promiseExit",
	})

	const handleDelete = async () => {
		setIsDeleting(true)

		const exit = await deleteWebhook({
			payload: { id: webhookId },
		})

		setIsDeleting(false)

		Exit.match(exit, {
			onSuccess: () => {
				toast.success("Webhook deleted successfully")
				onOpenChange(false)
				onSuccess?.()
			},
			onFailure: (cause) => {
				console.error("Failed to delete webhook:", cause)
				toast.error("Failed to delete webhook")
			},
		})
	}

	return (
		<Modal isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContent size="lg">
				<ModalHeader>
					<ModalTitle>Delete webhook</ModalTitle>
					<Description>
						Are you sure you want to delete <strong>{webhookName}</strong>? This action cannot be
						undone and any integrations using this webhook will stop working.
					</Description>
				</ModalHeader>

				<ModalBody />

				<ModalFooter>
					<Button intent="outline" onPress={() => onOpenChange(false)} isDisabled={isDeleting}>
						Cancel
					</Button>
					<Button intent="danger" onPress={handleDelete} isDisabled={isDeleting}>
						{isDeleting ? "Deleting..." : "Delete"}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
