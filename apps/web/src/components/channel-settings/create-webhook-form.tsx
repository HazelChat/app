import { useAtomSet } from "@effect-atom/atom-react"
import type { ChannelId } from "@hazel/schema"
import { type } from "arktype"
import { Exit } from "effect"
import { useState } from "react"
import { toast } from "sonner"
import { createChannelWebhookMutation } from "~/atoms/channel-webhook-atoms"
import IconPlus from "~/components/icons/icon-plus"
import { Button } from "~/components/ui/button"
import { Description, FieldError, Label } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { TextField } from "~/components/ui/text-field"
import { Textarea } from "~/components/ui/textarea"
import { useAppForm } from "~/hooks/use-app-form"
import { TokenDisplay } from "./token-display"

const webhookSchema = type({
	name: "1<string<101",
	"description?": "string",
	"avatarUrl?": "string",
})

type WebhookFormData = typeof webhookSchema.infer

interface CreateWebhookFormProps {
	channelId: ChannelId
	onSuccess?: () => void
}

export function CreateWebhookForm({ channelId, onSuccess }: CreateWebhookFormProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const [createdWebhook, setCreatedWebhook] = useState<{
		token: string
		webhookUrl: string
	} | null>(null)

	const createWebhook = useAtomSet(createChannelWebhookMutation, {
		mode: "promiseExit",
	})

	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			avatarUrl: "",
		} as WebhookFormData,
		validators: {
			onChange: webhookSchema,
		},
		onSubmit: async ({ value }) => {
			const exit = await createWebhook({
				payload: {
					channelId,
					name: value.name,
					description: value.description || undefined,
					avatarUrl: value.avatarUrl || undefined,
				},
			})

			Exit.match(exit, {
				onSuccess: (result) => {
					setCreatedWebhook({
						token: result.token,
						webhookUrl: result.webhookUrl,
					})
					toast.success("Webhook created successfully")
					onSuccess?.()
				},
				onFailure: (cause) => {
					console.error("Failed to create webhook:", cause)
					toast.error("Failed to create webhook")
				},
			})
		},
	})

	const handleDismissToken = () => {
		setCreatedWebhook(null)
		setIsExpanded(false)
		form.reset()
	}

	if (createdWebhook) {
		return (
			<TokenDisplay
				token={createdWebhook.token}
				webhookUrl={createdWebhook.webhookUrl}
				onDismiss={handleDismissToken}
			/>
		)
	}

	if (!isExpanded) {
		return (
			<Button intent="secondary" size="md" onPress={() => setIsExpanded(true)}>
				<IconPlus data-slot="icon" />
				Create webhook
			</Button>
		)
	}

	return (
		<div className="rounded-xl border border-border bg-bg p-4">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					form.handleSubmit()
				}}
				className="space-y-4"
			>
				<form.AppField
					name="name"
					children={(field) => (
						<TextField>
							<Label>Name</Label>
							<Description>A display name for this webhook</Description>
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
							<Description>Optional description for this webhook</Description>
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
							<Description>Optional avatar image URL for the webhook bot</Description>
							<Input
								placeholder="https://example.com/avatar.png"
								value={field.state.value ?? ""}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
						</TextField>
					)}
				/>

				<div className="flex items-center gap-2 pt-2">
					<Button intent="outline" type="button" onPress={() => setIsExpanded(false)}>
						Cancel
					</Button>
					<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
						{([canSubmit, isSubmitting]) => (
							<Button intent="primary" type="submit" isDisabled={!canSubmit || isSubmitting}>
								{isSubmitting ? "Creating..." : "Create webhook"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	)
}
