import { useAtomSet } from "@effect-atom/atom-react"
import { type } from "arktype"
import { useCallback } from "react"
import { createOrganizationMutation } from "~/atoms/organization-atoms"
import { IconServers } from "~/components/icons/icon-servers"
import { Button } from "~/components/ui/button"
import { Description, FieldError, Label } from "~/components/ui/field"
import { Input, InputGroup } from "~/components/ui/input"
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "~/components/ui/modal"
import { TextField } from "~/components/ui/text-field"
import { useAppForm } from "~/hooks/use-app-form"
import { toastExit } from "~/lib/toast-exit"

const organizationSchema = type({
	name: "string > 2",
	slug: "string > 2",
})

type OrganizationFormData = typeof organizationSchema.infer

interface CreateOrganizationModalProps {
	isOpen: boolean
	onOpenChange: (isOpen: boolean) => void
}

export function CreateOrganizationModal({ isOpen, onOpenChange }: CreateOrganizationModalProps) {
	const createOrganization = useAtomSet(createOrganizationMutation, {
		mode: "promiseExit",
	})

	const handleClose = useCallback(() => {
		onOpenChange(false)
	}, [onOpenChange])

	const form = useAppForm({
		defaultValues: {
			name: "",
			slug: "",
		} as OrganizationFormData,
		validators: {
			onChange: organizationSchema,
		},
		onSubmit: async ({ value }) => {
			const exit = await toastExit(
				createOrganization({
					payload: {
						name: value.name,
						slug: value.slug,
						logoUrl: null,
						settings: null,
					},
				}),
				{
					loading: "Creating server...",
					success: (result) => {
						// Close modal and reset form
						handleClose()
						form.reset()

						// Redirect to the new organization
						// WorkOS will handle the organization switch
						const backendUrl = import.meta.env.VITE_BACKEND_URL
						const frontendUrl = window.location.origin
						const returnUrl = `${frontendUrl}/${result.data.slug}`

						window.location.href = `${backendUrl}/auth/login?organizationId=${result.data.id}&returnTo=${encodeURIComponent(returnUrl)}`

						return "Server created successfully"
					},
					customErrors: {
						OrganizationSlugAlreadyExistsError: (error) => ({
							title: "Slug already taken",
							description: `The slug "${error.slug}" is already in use. Please choose a different one.`,
							isRetryable: false,
						}),
					},
				},
			)

			return exit
		},
	})

	return (
		<Modal>
			<ModalContent isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
				<ModalHeader>
					<ModalTitle>Create a new Server</ModalTitle>
					<Description>
						Give your server a name and optional slug to create a new organization.
					</Description>
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
									<Label>Server Name</Label>
									<InputGroup>
										<IconServers data-slot="icon" className="text-muted-fg" />
										<Input
											placeholder="Acme Corp"
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
							name="slug"
							children={(field) => (
								<TextField>
									<Label>Server Slug</Label>
									<InputGroup>
										<Input
											placeholder="acme-corp"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											aria-invalid={!!field.state.meta.errors?.length}
										/>
									</InputGroup>
									<Description>
										A unique identifier for your server URL (e.g., yourapp.com/acme-corp)
									</Description>
									{field.state.meta.errors?.[0] && (
										<FieldError>{field.state.meta.errors[0].message}</FieldError>
									)}
								</TextField>
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
									{isSubmitting ? "Creating..." : "Create server"}
								</Button>
							)}
						</form.Subscribe>
					</ModalFooter>
				</form>
			</ModalContent>
		</Modal>
	)
}
