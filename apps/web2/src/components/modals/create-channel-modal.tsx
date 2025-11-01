import { useAtomSet } from "@effect-atom/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { createChannelMutation } from "~/atoms/channel-atoms"
import IconHashtag from "~/components/icons/icon-hashtag"
import { Button } from "~/components/ui/button"
import { Description, FieldError, Label } from "~/components/ui/field"
import { Input, InputGroup } from "~/components/ui/input"
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "~/components/ui/modal"
import { Select, SelectContent, SelectItem, SelectTrigger } from "~/components/ui/select"
import { TextField } from "~/components/ui/text-field"
import { useAppForm } from "~/hooks/use-app-form"
import { useOrganization } from "~/hooks/use-organization"
import { useAuth } from "~/lib/auth"
import { toastExit } from "~/lib/toast-exit"

const channelSchema = type({
	name: "string > 2",
	type: "'public'|'private'",
})

type ChannelFormData = typeof channelSchema.infer

interface CreateChannelModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export function CreateChannelModal({ isOpen, onOpenChange }: CreateChannelModalProps) {
	const { user } = useAuth()
	const { organizationId, slug } = useOrganization()
	const navigate = useNavigate()

	const createChannel = useAtomSet(createChannelMutation, {
		mode: "promiseExit",
	})

	const form = useAppForm({
		defaultValues: {
			name: "",
			type: "public" as "public" | "private",
		} as ChannelFormData,
		validators: {
			onChange: channelSchema,
		},
		onSubmit: async ({ value }) => {
			if (!user?.id || !organizationId || !slug) return

			const exit = await toastExit(
				createChannel({
					payload: {
						name: value.name,
						type: value.type,
						organizationId,
						parentChannelId: null,
					},
				}),
				{
					loading: "Creating channel...",
					success: (_result) => {
						// Navigate back to org page
						// TODO: Navigate to channel when route exists (rework to use optimsitcAction)
						navigate({
							to: "/$orgSlug",
							params: {
								orgSlug: slug,
							},
						})

						// Close modal and reset form
						onOpenChange(false)
						form.reset()

						return "Channel created successfully"
					},
				},
			)

			return exit
		},
	})

	return (
		<Modal isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContent size="lg">
				<ModalHeader>
					<ModalTitle>Create a new Channel</ModalTitle>
					<Description>Give your channel a name and type to create a new channel.</Description>
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
									<Label>Channel Name</Label>
									<InputGroup>
										<IconHashtag data-slot="icon" className="text-muted-fg" />
										<Input
											placeholder="general"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											aria-invalid={!!field.state.meta.errors?.length}
										/>
									</InputGroup>
									{field.state.meta.errors?.[0] && (
										<FieldError>{field.state.meta.errors[0].message}</FieldError>
									)}
								</TextField>
							)}
						/>

						<form.AppField
							name="type"
							children={(field) => (
								<>
									<Label>Channel Type</Label>
									<Select
										defaultSelectedKey={field.state.value}
										onSelectionChange={(key) =>
											field.handleChange(key as "public" | "private")
										}
									>
										<SelectTrigger />
										<SelectContent>
											<SelectItem id="public" textValue="Public">
												Public
											</SelectItem>
											<SelectItem id="private" textValue="Private">
												Private
											</SelectItem>
										</SelectContent>
									</Select>
									{field.state.meta.errors?.[0] && (
										<FieldError>{field.state.meta.errors[0].message}</FieldError>
									)}
								</>
							)}
						/>
					</ModalBody>

					<ModalFooter>
						<Button intent="outline" onPress={() => onOpenChange(false)} type="button">
							Cancel
						</Button>
						<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
							{([canSubmit, isSubmitting]) => (
								<Button
									intent="primary"
									type="submit"
									isDisabled={!canSubmit || isSubmitting}
								>
									{isSubmitting ? "Creating..." : "Create channel"}
								</Button>
							)}
						</form.Subscribe>
					</ModalFooter>
				</form>
			</ModalContent>
		</Modal>
	)
}
