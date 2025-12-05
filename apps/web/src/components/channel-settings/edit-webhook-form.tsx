import { useAtomSet } from "@effect-atom/atom-react"
import { type } from "arktype"
import { Exit } from "effect"
import type { WebhookData } from "~/atoms/channel-webhook-atoms"
import { toast } from "sonner"
import { updateChannelWebhookMutation } from "~/atoms/channel-webhook-atoms"
import { Button } from "~/components/ui/button"
import { Description, FieldError, Label } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "~/components/ui/modal"
import { Switch } from "~/components/ui/switch"
import { TextField } from "~/components/ui/text-field"
import { Textarea } from "~/components/ui/textarea"
import { useAppForm } from "~/hooks/use-app-form"

const webhookSchema = type({
	name: "1<string<101",
	"description?": "string",
	"avatarUrl?": "string",
	isEnabled: "boolean",
})

type WebhookFormData = typeof webhookSchema.infer

interface EditWebhookFormProps {
	webhook: WebhookData
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export function EditWebhookForm({ webhook, isOpen, onOpenChange, onSuccess }: EditWebhookFormProps) {
	const updateWebhook = useAtomSet(updateChannelWebhookMutation, {
		mode: "promiseExit",
	})

	const form = useAppForm({
		defaultValues: {
			name: webhook.name,
			description: webhook.description ?? "",
			avatarUrl: webhook.avatarUrl ?? "",
			isEnabled: webhook.isEnabled,
		} as WebhookFormData,
		validators: {
			onChange: webhookSchema,
		},
		onSubmit: async ({ value }) => {
			const exit = await updateWebhook({
				payload: {
					id: webhook.id,
					name: value.name,
					description: value.description || null,
					avatarUrl: value.avatarUrl || null,
					isEnabled: value.isEnabled,
				},
			})

			Exit.match(exit, {
				onSuccess: () => {
					toast.success("Webhook updated successfully")
					handleClose()
					onSuccess?.()
				},
				onFailure: (cause) => {
					console.error("Failed to update webhook:", cause)
					toast.error("Failed to update webhook")
				},
			})
		},
	})

	const handleClose = () => {
		form.reset()
		onOpenChange(false)
	}

	return (
		<Modal isOpen={isOpen} onOpenChange={handleClose}>
			<ModalContent size="lg">
				<ModalHeader>
					<ModalTitle>Edit Webhook</ModalTitle>
					<Description>Update the webhook configuration</Description>
				</ModalHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
				>
					<ModalBody className="flex flex-col gap-4">
						<form.AppField
							name="name"
							children={(field) => (
								<TextField>
									<Label>Name</Label>
									<Input
										placeholder="My Webhook"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										aria-invalid={!!field.state.meta.errors?.length}
									/>
									{field.state.meta.errors?.[0] && (
										<FieldError>{field.state.meta.errors[0].message}</FieldError>
									)}
								</TextField>
							)}
						/>

						<form.AppField
							name="description"
							children={(field) => (
								<TextField>
									<Label>Description</Label>
									<Textarea
										placeholder="Describe what this webhook is used for..."
										value={field.state.value ?? ""}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										rows={2}
									/>
								</TextField>
							)}
						/>

						<form.AppField
							name="avatarUrl"
							children={(field) => (
								<TextField>
									<Label>Avatar URL</Label>
									<Input
										placeholder="https://example.com/avatar.png"
										value={field.state.value ?? ""}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
								</TextField>
							)}
						/>

						<form.AppField
							name="isEnabled"
							children={(field) => (
								<Switch
									isSelected={field.state.value}
									onChange={(value) => field.handleChange(value)}
								>
									<Label>Enabled</Label>
									<Description slot="description">
										When disabled, the webhook will reject incoming requests
									</Description>
								</Switch>
							)}
						/>
					</ModalBody>

					<ModalFooter>
						<Button intent="outline" onPress={handleClose} type="button">
							Cancel
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button
									intent="primary"
									type="submit"
									isDisabled={!canSubmit || isSubmitting}
								>
									{isSubmitting ? "Saving..." : "Save changes"}
								</Button>
							)}
						</form.Subscribe>
					</ModalFooter>
				</form>
			</ModalContent>
		</Modal>
	)
}
