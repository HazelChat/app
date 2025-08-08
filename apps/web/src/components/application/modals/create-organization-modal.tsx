import { useConvexAction } from "@convex-dev/react-query"
import { api } from "@hazel/backend/api"
import { useNavigate } from "@tanstack/react-router"
import { Building02 } from "@untitledui/icons"
import { type } from "arktype"
import { useCallback, useEffect } from "react"
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { Dialog, Modal, ModalOverlay } from "~/components/application/modals/modal"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { BackgroundPattern } from "~/components/shared-assets/background-patterns"
import { useAppForm } from "~/hooks/use-app-form"

const organizationSchema = type({
	name: "string.trim",
	slug: "3 <= string < 50",
	logoUrl: "string.url | undefined",
})

type OrganizationFormData = typeof organizationSchema.infer

interface CreateOrganizationModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export const CreateOrganizationModal = ({ isOpen, onOpenChange }: CreateOrganizationModalProps) => {
	const createOrganizationAction = useConvexAction(api.organizations.create)
	const navigate = useNavigate()

	const generateSlug = useCallback((name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.substring(0, 50)
	}, [])

	const form = useAppForm({
		defaultValues: {
			name: "",
			slug: "",
			logoUrl: undefined,
		} as OrganizationFormData,
		validators: {
			onChange: organizationSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await createOrganizationAction({
					name: value.name.trim(),
					slug: value.slug.trim(),
					logoUrl: value.logoUrl?.trim() || undefined,
				})

				toast.success(`Organization "${value.name}" created successfully!`)

				// Close modal and reset state
				onOpenChange(false)
				form.reset()

				// The organization has been created in WorkOS
				// The webhook will handle creating the Convex records
				toast.info("Setting up your new organization...")

				// Poll for the organization to be created in Convex
				// This gives time for the WorkOS webhook to sync
				let attempts = 0
				const maxAttempts = 10
				const pollInterval = setInterval(async () => {
					attempts++
					try {
						await navigate({ to: "/" })
						clearInterval(pollInterval)
					} catch (_error) {
						if (attempts >= maxAttempts) {
							clearInterval(pollInterval)
							window.location.href = "/"
						}
					}
				}, 1000)
			} catch (error: any) {
				console.error("Failed to create organization:", error)
				if (error.message?.includes("slug already exists")) {
					form.setFieldMeta("slug", (meta) => ({
						...meta,
						errors: [{ message: "This slug is already taken" }],
					}))
				} else {
					toast.error(error.message || "Failed to create organization")
				}
			}
		},
	})

	// Auto-generate slug from name
	useEffect(() => {
		let prevName = ""
		const unsubscribe = form.store.subscribe(() => {
			const name = form.getFieldValue("name") || ""
			const currentSlug = form.getFieldValue("slug") || ""

			// Only update if name has changed
			if (name !== prevName) {
				prevName = name
				// Only auto-generate if slug is empty or was previously auto-generated from old name
				if (!currentSlug || currentSlug === generateSlug(prevName)) {
					form.setFieldValue("slug", generateSlug(name))
				}
			}
		})
		return () => unsubscribe()
	}, [form, generateSlug])

	const handleClose = () => {
		onOpenChange(false)
		form.reset()
	}

	return (
		<AriaDialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalOverlay isDismissable>
				<Modal>
					<Dialog>
						<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-130">
							<CloseButton
								onClick={handleClose}
								theme="light"
								size="lg"
								className="absolute top-3 right-3"
							/>
							<div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
								<div className="relative w-max">
									<FeaturedIcon color="gray" size="lg" theme="modern" icon={Building02} />
									<BackgroundPattern
										pattern="circle"
										size="sm"
										className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
									/>
								</div>
								<div className="z-10 flex flex-col gap-0.5">
									<AriaHeading slot="title" className="font-semibold text-md text-primary">
										Create a new organization
									</AriaHeading>
									<p className="text-sm text-tertiary">
										Set up a new workspace for your team
									</p>
								</div>
							</div>
							<div className="h-5 w-full" />
							<div className="flex flex-col gap-4 px-4 sm:px-6">
								{/* Organization Name */}
								<form.AppField
									name="name"
									children={(field) => (
										<field.Input
											label={"Organization name"}
											id="org-name"
											size="md"
											placeholder="Acme Inc."
											value={field.state.value}
											onChange={(value) => field.handleChange(value)}
											onBlur={field.handleBlur}
											isInvalid={!!field.state.meta.errors?.length}
											autoFocus
											hint={field.state.meta.errors
												?.map((error) => error?.message)
												.join(", ")}
										/>
									)}
								/>

								{/* Organization Slug */}
								<form.AppField
									name="slug"
									children={(field) => (
										<div className="flex flex-col gap-1.5">
											<field.Input
												label="Organization slug"
												id="org-slug"
												size="md"
												placeholder="acme-inc"
												value={field.state.value}
												onChange={(value) => field.handleChange(value)}
												onBlur={field.handleBlur}
												isInvalid={!!field.state.meta.errors?.length}
												hint={field.state.meta.errors
													?.map((error) => error?.message)
													.join(", ")}
											/>
											{!field.state.meta.errors?.length && field.state.value && (
												<p className="text-tertiary text-xs">
													Your organization URL will be: /{field.state.value}
												</p>
											)}
										</div>
									)}
								/>

								{/* Logo URL (Optional) */}
								<form.AppField
									name="logoUrl"
									children={(field) => (
										<field.Input
											label="Logo URL (optional)"
											id="org-logo"
											size="md"
											placeholder="https://example.com/logo.png"
											value={field.state.value}
											onChange={(value) => field.handleChange(value)}
											onBlur={field.handleBlur}
											isInvalid={!!field.state.meta.errors?.length}
											hint={field.state.meta.errors
												?.map((error) => error?.message)
												.join(", ")}
										/>
									)}
								/>
							</div>
							<div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
								<Button
									color="secondary"
									size="lg"
									onClick={handleClose}
									isDisabled={form.state.isSubmitting}
								>
									Cancel
								</Button>
								<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
									{([canSubmit, isSubmitting]) => (
										<Button
											color="primary"
											size="lg"
											onClick={form.handleSubmit}
											isDisabled={!canSubmit || isSubmitting}
										>
											{isSubmitting ? "Creating..." : "Create organization"}
										</Button>
									)}
								</form.Subscribe>
							</div>
						</div>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</AriaDialogTrigger>
	)
}
